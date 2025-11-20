import puppeteer, { Browser, Page } from 'puppeteer';
import { parseString } from 'xml2js';

export interface ScrapedPage {
  url: string;
  title: string;
  content: string;
  description?: string;
  images?: string[];  // Array of image URLs from content
}

export interface ScrapeResult {
  url: string;
  success: boolean;
  data?: ScrapedPage;
  error?: {
    message: string;
    type: string;
    attempt: number;
  };
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
    const response = await fetch(sitemapUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SitemapBot/1.0)',
        'Accept': 'application/xml, text/xml, */*',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xml = await response.text();

    if (!xml.trim().startsWith('<')) {
      console.error(`Invalid XML response from ${sitemapUrl}. First 100 chars:`, xml.substring(0, 100));
      throw new Error('Response is not valid XML');
    }

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

    // Navigate with timeout - use domcontentloaded for faster loading
    // and fall back if networkidle2 takes too long
    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 60000, // Increased to 60s
      });

      // Wait for network to be idle, but don't fail if it times out
      try {
        await page.waitForNetworkIdle({ timeout: 10000 }); // 10s max for network idle
      } catch {
        // Network still active, but we can proceed
        console.log(`Network still active for ${url}, proceeding anyway`);
      }
    } catch (error) {
      // If navigation fails completely, try one more time with just 'load'
      console.log(`First navigation attempt failed for ${url}, trying with 'load' strategy`);
      await page.goto(url, {
        waitUntil: 'load',
        timeout: 60000,
      });
    }

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
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error';
    const errorName = error.name || 'Error';

    console.error(`Error scraping ${url}:`, {
      name: errorName,
      message: errorMessage,
      type: error.constructor.name,
    });

    // Provide more helpful error messages
    if (errorMessage.includes('Navigation timeout')) {
      console.error(`Navigation timeout for ${url} - site may be slow or blocking requests`);
    } else if (errorMessage.includes('net::ERR_NAME_NOT_RESOLVED')) {
      console.error(`DNS resolution failed for ${url} - check DNS configuration`);
    } else if (errorMessage.includes('net::ERR_CONNECTION_REFUSED')) {
      console.error(`Connection refused for ${url} - site may be down or blocking`);
    }

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
      // DNS and network optimizations
      '--dns-prefetch-disable', // Disable DNS prefetching to avoid issues
      '--disable-features=NetworkService', // Use legacy network stack
      '--disable-background-networking',
    ],
  });
}

/**
 * Scrape a page with automatic retry logic (up to maxRetries attempts)
 */
export async function scrapePageWithRetry(
  url: string,
  browser: Browser,
  maxRetries = 3
): Promise<ScrapeResult> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await scrapePage(url, browser);

      if (result !== null) {
        return {
          url,
          success: true,
          data: result,
        };
      }

      // If result is null but no exception, treat as error
      if (attempt < maxRetries) {
        console.log(`Attempt ${attempt}/${maxRetries} failed for ${url}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Exponential backoff
      }
    } catch (error: any) {
      console.error(`Attempt ${attempt}/${maxRetries} failed for ${url}:`, error.message);

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Exponential backoff
      } else {
        return {
          url,
          success: false,
          error: {
            message: error.message || 'Unknown error',
            type: error.name || 'Error',
            attempt: maxRetries,
          },
        };
      }
    }
  }

  return {
    url,
    success: false,
    error: {
      message: 'Max retries exceeded',
      type: 'RetryError',
      attempt: maxRetries,
    },
  };
}

/**
 * Restart browser to free memory
 */
export async function restartBrowser(browser: Browser): Promise<Browser> {
  console.log('Restarting browser to free memory...');
  await browser.close();
  return await launchBrowser();
}

/**
 * Scrape multiple URLs with rate limiting and retry logic
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

/**
 * Scrape multiple URLs with retry logic and detailed error tracking
 */
export async function scrapeMultiplePagesWithRetry(
  urls: string[],
  maxConcurrent = 3,
  delayMs = 1000,
  maxRetries = 3,
  onProgress?: (current: number, total: number, result: ScrapeResult) => void
): Promise<ScrapeResult[]> {
  let browser = await launchBrowser();
  const results: ScrapeResult[] = [];
  const batchesBeforeRestart = 50; // Restart browser every 50 batches

  try {
    // Process in batches
    for (let i = 0; i < urls.length; i += maxConcurrent) {
      const batch = urls.slice(i, i + maxConcurrent);
      const batchIndex = Math.floor(i / maxConcurrent);

      // Restart browser periodically to prevent memory issues
      if (batchIndex > 0 && batchIndex % batchesBeforeRestart === 0) {
        browser = await restartBrowser(browser);
      }

      const batchResults = await Promise.all(
        batch.map((url) => scrapePageWithRetry(url, browser, maxRetries))
      );

      results.push(...batchResults);

      // Call progress callback if provided
      if (onProgress) {
        batchResults.forEach((result, idx) => {
          onProgress(i + idx + 1, urls.length, result);
        });
      }

      // Delay between batches
      if (i + maxConcurrent < urls.length) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      console.log(`Processed ${i + batch.length}/${urls.length} pages (${results.filter(r => r.success).length} successful)`);
    }
  } finally {
    await browser.close();
  }

  return results;
}
