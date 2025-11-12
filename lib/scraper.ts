import puppeteer, { Browser, Page } from 'puppeteer';
import { parseString } from 'xml2js';

export interface ScrapedPage {
  url: string;
  title: string;
  content: string;
  description?: string;
  images?: string[];  // Array of image URLs from content
}

/**
 * Find sitemap.xml URL for a website
 */
export async function findSitemapUrl(baseUrl: string): Promise<string | null> {
  const possiblePaths = [
    '/sitemap.xml',
    '/sitemap_index.xml',
    '/sitemap1.xml',
    '/post-sitemap.xml',
    '/page-sitemap.xml',
  ];

  // Try common sitemap paths
  for (const path of possiblePaths) {
    try {
      const sitemapUrl = new URL(path, baseUrl).href;
      const response = await fetch(sitemapUrl, { method: 'HEAD' });
      if (response.ok) {
        console.log(`Found sitemap: ${sitemapUrl}`);
        return sitemapUrl;
      }
    } catch (error) {
      // Continue to next path
    }
  }

  // Try robots.txt
  try {
    const robotsUrl = new URL('/robots.txt', baseUrl).href;
    const response = await fetch(robotsUrl);
    if (response.ok) {
      const text = await response.text();
      const sitemapMatch = text.match(/Sitemap:\s*(.+)/i);
      if (sitemapMatch) {
        console.log(`Found sitemap in robots.txt: ${sitemapMatch[1]}`);
        return sitemapMatch[1].trim();
      }
    }
  } catch (error) {
    console.error('Error checking robots.txt:', error);
  }

  return null;
}

/**
 * Parse sitemap XML and extract URLs with dates
 */
export async function parseSitemapWithDates(sitemapUrl: string): Promise<Array<{ url: string; date?: Date }>> {
  try {
    const response = await fetch(sitemapUrl);
    const xml = await response.text();

    return new Promise((resolve, reject) => {
      parseString(xml, (err, result) => {
        if (err) {
          reject(err);
          return;
        }

        const urlsWithDates: Array<{ url: string; date?: Date }> = [];

        // Handle sitemap index (return child sitemap URLs)
        if (result.sitemapindex) {
          const sitemaps = result.sitemapindex.sitemap || [];
          for (const sitemap of sitemaps) {
            if (sitemap.loc && sitemap.loc[0]) {
              urlsWithDates.push({ url: sitemap.loc[0] });
            }
          }
        }

        // Handle regular sitemap with dates
        if (result.urlset) {
          const urlElements = result.urlset.url || [];
          for (const urlElement of urlElements) {
            if (urlElement.loc && urlElement.loc[0]) {
              const url = urlElement.loc[0];

              // Try to extract date from lastmod or pubDate
              let date: Date | undefined;
              if (urlElement.lastmod && urlElement.lastmod[0]) {
                date = new Date(urlElement.lastmod[0]);
              } else if (urlElement['pubDate'] && urlElement['pubDate'][0]) {
                date = new Date(urlElement['pubDate'][0]);
              }

              urlsWithDates.push({ url, date });
            }
          }
        }

        resolve(urlsWithDates);
      });
    });
  } catch (error) {
    console.error('Error parsing sitemap:', error);
    return [];
  }
}

/**
 * Parse sitemap XML and extract URLs (legacy function for backwards compatibility)
 */
export async function parseSitemap(sitemapUrl: string): Promise<string[]> {
  const urlsWithDates = await parseSitemapWithDates(sitemapUrl);
  return urlsWithDates.map(item => item.url);
}

/**
 * Scrape a single page with Puppeteer
 */
export async function scrapePage(url: string, browser: Browser): Promise<ScrapedPage | null> {
  let page: Page | null = null;

  try {
    page = await browser.newPage();

    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Navigate with timeout
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait a bit for dynamic content
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Extract content and images
    const data = await page.evaluate(() => {
      // Remove unwanted elements
      const unwantedSelectors = [
        'script',
        'style',
        'noscript',
        'iframe',
        'nav',
        'header',
        'footer',
        '.navigation',
        '.sidebar',
        '.cookie-banner',
        '.advertisement',
        '[role="navigation"]',
        '[role="complementary"]',
      ];

      unwantedSelectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => el.remove());
      });

      // Get title
      const title = document.title || '';

      // Get meta description
      const metaDesc = document.querySelector('meta[name="description"]');
      const description = metaDesc?.getAttribute('content') || '';

      // Get main content
      const mainSelectors = [
        'main',
        'article',
        '[role="main"]',
        '.main-content',
        '.content',
        '#content',
      ];

      let contentElement = null;
      for (const selector of mainSelectors) {
        contentElement = document.querySelector(selector);
        if (contentElement) break;
      }

      // Fallback to body if no main content found
      if (!contentElement) {
        contentElement = document.body;
      }

      // Extract text content
      const content = (contentElement as HTMLElement | null)?.innerText || '';

      // Extract images from main content
      const images: string[] = [];
      if (contentElement) {
        const imgElements = contentElement.querySelectorAll('img');
        imgElements.forEach((img) => {
          const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');

          if (src && !src.startsWith('data:')) {
            // Check if image is meaningful size (not icons/logos)
            const width = img.naturalWidth || img.width || 0;
            const height = img.naturalHeight || img.height || 0;

            // Only include images that are likely content images (>200x200px)
            // If dimensions are not available, include anyway
            if ((width === 0 && height === 0) || (width >= 200 && height >= 200)) {
              // Convert relative URLs to absolute
              try {
                const absoluteUrl = new URL(src, window.location.href).href;
                if (!images.includes(absoluteUrl)) {
                  images.push(absoluteUrl);
                }
              } catch (e) {
                // Skip invalid URLs
              }
            }
          }
        });
      }

      return {
        title,
        description,
        content: content
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .join('\n'),
        images: images.slice(0, 10), // Limit to max 10 images per page
      };
    });

    await page.close();

    return {
      url,
      title: data.title,
      content: data.content,
      description: data.description,
      images: data.images,
    };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    if (page) {
      await page.close().catch(() => {});
    }
    return null;
  }
}

/**
 * Launch Puppeteer browser
 */
export async function launchBrowser(): Promise<Browser> {
  return await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
    ],
  });
}

/**
 * Scrape multiple URLs with rate limiting
 */
export async function scrapeMultiplePages(
  urls: string[],
  maxConcurrent = 3,
  delayMs = 1000
): Promise<ScrapedPage[]> {
  const browser = await launchBrowser();
  const results: ScrapedPage[] = [];

  try {
    // Process in batches
    for (let i = 0; i < urls.length; i += maxConcurrent) {
      const batch = urls.slice(i, i + maxConcurrent);
      const batchResults = await Promise.all(
        batch.map((url) => scrapePage(url, browser))
      );

      // Filter out nulls and add to results
      results.push(...batchResults.filter((r): r is ScrapedPage => r !== null));

      // Delay between batches
      if (i + maxConcurrent < urls.length) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      console.log(`Processed ${i + batch.length}/${urls.length} pages`);
    }
  } finally {
    await browser.close();
  }

  return results;
}
