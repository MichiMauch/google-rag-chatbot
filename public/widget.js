/**
 * Google RAG Chatbot - Embed Widget
 * Supports two modes: 'inline' (fixed iframe) and 'popup' (toggle button)
 *
 * Usage (Inline Mode):
 * <div id="chat-container"></div>
 * <script src="https://yourdomain.com/widget.js"
 *         data-chat-name="my-chat"
 *         data-mode="inline"
 *         data-container="chat-container"
 *         data-theme="blue"></script>
 *
 * Usage (Popup Mode):
 * <script src="https://yourdomain.com/widget.js"
 *         data-chat-name="my-chat"
 *         data-mode="popup"
 *         data-position="bottom-right"
 *         data-theme="blue"></script>
 *
 * Usage (Next.js with Script component):
 * <Script
 *   src="https://yourdomain.com/widget.js"
 *   onLoad={() => {
 *     window.initGoogleRagChat({
 *       chatName: 'my-chat',
 *       mode: 'popup',
 *       position: 'bottom-right',
 *       theme: 'blue'
 *     });
 *   }}
 * />
 */

(function() {
  'use strict';

  // Get script element and configuration
  // Support both document.currentScript (standard) and querySelector fallback (Next.js Script component)
  let scriptTag = document.currentScript;

  if (!scriptTag) {
    // Fallback: Find the script tag by src attribute (for Next.js Script component)
    const scripts = document.querySelectorAll('script[src*="widget.js"]');
    scriptTag = scripts[scripts.length - 1]; // Get the last one (most recently added)
  }

  if (!scriptTag) {
    console.error('Google RAG Chatbot Widget: Could not find widget script tag');
    return;
  }

  const baseUrl = scriptTag.src.split('/widget.js')[0];

  const config = {
    chatName: scriptTag.getAttribute('data-chat-name') || '',
    mode: scriptTag.getAttribute('data-mode') || 'popup',
    theme: scriptTag.getAttribute('data-theme') || 'blue',
    position: scriptTag.getAttribute('data-position') || 'bottom-right',
    container: scriptTag.getAttribute('data-container') || '',
  };

  if (!config.chatName) {
    console.error('Google RAG Chatbot Widget: data-chat-name attribute is required');
    console.error('Script tag found:', scriptTag);
    console.error('Attributes:', {
      'data-chat-name': scriptTag.getAttribute('data-chat-name'),
      'data-mode': scriptTag.getAttribute('data-mode'),
      'data-theme': scriptTag.getAttribute('data-theme'),
      'data-position': scriptTag.getAttribute('data-position'),
    });
    return;
  }

  // Build iframe URL
  const iframeUrl = `${baseUrl}/embed/${encodeURIComponent(config.chatName)}?theme=${encodeURIComponent(config.theme)}`;

  if (config.mode === 'inline') {
    // INLINE MODE: Fixed iframe in specified container
    initInlineMode();
  } else {
    // POPUP MODE: Toggle button with floating iframe
    initPopupMode();
  }

  function initInlineMode() {
    const containerId = config.container;
    if (!containerId) {
      console.error('Google RAG Chatbot Widget: data-container attribute is required for inline mode');
      return;
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createInlineIframe);
    } else {
      createInlineIframe();
    }

    function createInlineIframe() {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error(`Google RAG Chatbot Widget: Container element #${containerId} not found`);
        return;
      }

      const iframe = document.createElement('iframe');
      iframe.src = iframeUrl;
      iframe.style.cssText = 'width: 100%; height: 100%; border: none; display: block;';
      iframe.setAttribute('allow', 'clipboard-write');
      iframe.setAttribute('title', 'Chat Widget');

      container.appendChild(iframe);

      // Listen for messages from iframe
      window.addEventListener('message', handleIframeMessage);
    }
  }

  function initPopupMode() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createPopupWidget);
    } else {
      createPopupWidget();
    }

    function createPopupWidget() {
      let isOpen = false;
      let unreadCount = 0;

      // Create container
      const widgetContainer = document.createElement('div');
      widgetContainer.id = 'google-rag-chat-widget';
      widgetContainer.style.cssText = 'position: fixed; z-index: 99999; font-family: system-ui, -apple-system, sans-serif;';

      // Position based on config
      const positions = {
        'bottom-right': 'bottom: 20px; right: 20px;',
        'bottom-left': 'bottom: 20px; left: 20px;',
        'top-right': 'top: 20px; right: 20px;',
        'top-left': 'top: 20px; left: 20px;',
      };
      widgetContainer.style.cssText += positions[config.position] || positions['bottom-right'];

      // Create toggle button
      const toggleButton = document.createElement('button');
      toggleButton.id = 'google-rag-chat-toggle';
      toggleButton.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      `;
      toggleButton.style.cssText = `
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        color: white;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s, box-shadow 0.2s;
        position: relative;
      `;

      // Create unread badge
      const unreadBadge = document.createElement('div');
      unreadBadge.id = 'google-rag-chat-badge';
      unreadBadge.style.cssText = `
        position: absolute;
        top: -5px;
        right: -5px;
        background: #ef4444;
        color: white;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: none;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        border: 2px solid white;
      `;
      toggleButton.appendChild(unreadBadge);

      // Create iframe container
      const iframeContainer = document.createElement('div');
      iframeContainer.id = 'google-rag-chat-iframe-container';
      iframeContainer.style.cssText = `
        position: fixed;
        display: none;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        overflow: hidden;
        transition: all 0.3s ease;
      `;

      // Responsive sizing
      if (window.innerWidth <= 768) {
        // Mobile: Full screen
        iframeContainer.style.cssText += `
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
          border-radius: 0;
        `;
      } else {
        // Desktop: Floating window
        const iframePositions = {
          'bottom-right': 'bottom: 90px; right: 20px; width: 400px; height: 600px;',
          'bottom-left': 'bottom: 90px; left: 20px; width: 400px; height: 600px;',
          'top-right': 'top: 90px; right: 20px; width: 400px; height: 600px;',
          'top-left': 'top: 90px; left: 20px; width: 400px; height: 600px;',
        };
        iframeContainer.style.cssText += iframePositions[config.position] || iframePositions['bottom-right'];
      }

      // Create close button for iframe
      const closeButton = document.createElement('button');
      closeButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;
      closeButton.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.1);
        border: none;
        color: #333;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
        transition: background 0.2s;
      `;
      closeButton.addEventListener('mouseenter', () => {
        closeButton.style.background = 'rgba(0, 0, 0, 0.2)';
      });
      closeButton.addEventListener('mouseleave', () => {
        closeButton.style.background = 'rgba(0, 0, 0, 0.1)';
      });

      // Create iframe
      const iframe = document.createElement('iframe');
      iframe.src = iframeUrl;
      iframe.style.cssText = 'width: 100%; height: 100%; border: none; display: block;';
      iframe.setAttribute('allow', 'clipboard-write');
      iframe.setAttribute('title', 'Chat Widget');

      // Assemble widget
      iframeContainer.appendChild(closeButton);
      iframeContainer.appendChild(iframe);
      widgetContainer.appendChild(toggleButton);
      widgetContainer.appendChild(iframeContainer);
      document.body.appendChild(widgetContainer);

      // Toggle button hover effects
      toggleButton.addEventListener('mouseenter', () => {
        toggleButton.style.transform = 'scale(1.05)';
        toggleButton.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2)';
      });
      toggleButton.addEventListener('mouseleave', () => {
        toggleButton.style.transform = 'scale(1)';
        toggleButton.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      });

      // Toggle functionality
      toggleButton.addEventListener('click', () => {
        isOpen = !isOpen;
        if (isOpen) {
          iframeContainer.style.display = 'block';
          toggleButton.style.display = 'none';
          unreadCount = 0;
          unreadBadge.style.display = 'none';

          // Send open event to parent
          window.postMessage({ type: 'chat:open' }, '*');
        } else {
          iframeContainer.style.display = 'none';
          toggleButton.style.display = 'flex';

          // Send close event to parent
          window.postMessage({ type: 'chat:close' }, '*');
        }
      });

      closeButton.addEventListener('click', () => {
        isOpen = false;
        iframeContainer.style.display = 'none';
        toggleButton.style.display = 'flex';

        // Send close event to parent
        window.postMessage({ type: 'chat:close' }, '*');
      });

      // Listen for messages from iframe
      window.addEventListener('message', (event) => {
        handleIframeMessage(event);

        // Handle new messages when closed
        if (event.data.type === 'chat:message' && !isOpen) {
          unreadCount++;
          unreadBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
          unreadBadge.style.display = 'flex';
        }
      });

      // Handle window resize for mobile responsiveness
      window.addEventListener('resize', () => {
        if (window.innerWidth <= 768) {
          iframeContainer.style.cssText = iframeContainer.style.cssText.replace(
            /top:.*?;|left:.*?;|right:.*?;|bottom:.*?;|width:.*?;|height:.*?;/g,
            ''
          );
          iframeContainer.style.cssText += `
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            height: 100%;
            border-radius: 0;
          `;
        }
      });
    }
  }

  function handleIframeMessage(event) {
    // Verify origin if needed
    // if (event.origin !== baseUrl) return;

    const data = event.data;

    switch (data.type) {
      case 'chat:ready':
        console.log('Google RAG Chatbot Widget: Chat is ready', data.chatName);
        break;

      case 'chat:message':
        // Custom event for parent page
        window.dispatchEvent(new CustomEvent('chatMessage', { detail: data }));
        break;

      case 'chat:open':
        window.dispatchEvent(new CustomEvent('chatOpen'));
        break;

      case 'chat:close':
        window.dispatchEvent(new CustomEvent('chatClose'));
        break;
    }
  }

  // Auto-initialize if we found the script tag
  if (scriptTag && config.chatName) {
    if (config.mode === 'inline') {
      initInlineMode();
    } else {
      initPopupMode();
    }
  }

  // Export global initialization function for Next.js Script component
  window.initGoogleRagChat = function(options) {
    const scripts = document.querySelectorAll('script[src*="widget.js"]');
    const widgetScript = scripts[scripts.length - 1];

    if (!widgetScript) {
      console.error('Google RAG Chatbot Widget: Could not find widget script');
      return;
    }

    const widgetBaseUrl = widgetScript.src.split('/widget.js')[0];

    const widgetConfig = {
      chatName: options.chatName || '',
      mode: options.mode || 'popup',
      theme: options.theme || 'blue',
      position: options.position || 'bottom-right',
      container: options.container || '',
      baseUrl: widgetBaseUrl,
    };

    if (!widgetConfig.chatName) {
      console.error('Google RAG Chatbot Widget: chatName is required');
      return;
    }

    // Build iframe URL
    const widgetIframeUrl = `${widgetConfig.baseUrl}/embed/${encodeURIComponent(widgetConfig.chatName)}?theme=${encodeURIComponent(widgetConfig.theme)}`;

    // Simple helper to create the widget with provided config
    if (widgetConfig.mode === 'inline') {
      createInlineWidget(widgetConfig, widgetIframeUrl);
    } else {
      createPopupWidget(widgetConfig, widgetIframeUrl);
    }
  };

  function createInlineWidget(cfg, iframeUrl) {
    const containerId = cfg.container;
    if (!containerId) {
      console.error('Google RAG Chatbot Widget: container is required for inline mode');
      return;
    }

    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Google RAG Chatbot Widget: Container element #${containerId} not found`);
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.src = iframeUrl;
    iframe.style.cssText = 'width: 100%; height: 100%; border: none; display: block;';
    iframe.setAttribute('allow', 'clipboard-write');
    iframe.setAttribute('title', 'Chat Widget');

    container.appendChild(iframe);

    window.addEventListener('message', handleIframeMessage);
  }

  function createPopupWidget(cfg, iframeUrl) {
    // Check if widget already exists
    if (document.getElementById('google-rag-chat-widget')) {
      console.warn('Google RAG Chatbot Widget: Widget already initialized');
      return;
    }

    let isOpen = false;
    let unreadCount = 0;

    // Create container
    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'google-rag-chat-widget';
    widgetContainer.style.cssText = 'position: fixed; z-index: 99999; font-family: system-ui, -apple-system, sans-serif;';

    // Position based on config
    const positions = {
      'bottom-right': 'bottom: 20px; right: 20px;',
      'bottom-left': 'bottom: 20px; left: 20px;',
      'top-right': 'top: 20px; right: 20px;',
      'top-left': 'top: 20px; left: 20px;',
    };
    widgetContainer.style.cssText += positions[cfg.position] || positions['bottom-right'];

    // Create toggle button
    const toggleButton = document.createElement('button');
    toggleButton.id = 'google-rag-chat-toggle';
    toggleButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `;
    toggleButton.style.cssText = `
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      color: white;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
      position: relative;
    `;

    // Create unread badge
    const unreadBadge = document.createElement('div');
    unreadBadge.id = 'google-rag-chat-badge';
    unreadBadge.style.cssText = `
      position: absolute;
      top: -5px;
      right: -5px;
      background: #ef4444;
      color: white;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: none;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
      border: 2px solid white;
    `;
    toggleButton.appendChild(unreadBadge);

    // Create iframe container
    const iframeContainer = document.createElement('div');
    iframeContainer.id = 'google-rag-chat-iframe-container';
    iframeContainer.style.cssText = `
      position: fixed;
      display: none;
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      overflow: hidden;
      transition: all 0.3s ease;
    `;

    // Responsive sizing
    if (window.innerWidth <= 768) {
      iframeContainer.style.cssText += `
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        height: 100%;
        border-radius: 0;
      `;
    } else {
      const iframePositions = {
        'bottom-right': 'bottom: 90px; right: 20px; width: 400px; height: 600px;',
        'bottom-left': 'bottom: 90px; left: 20px; width: 400px; height: 600px;',
        'top-right': 'top: 90px; right: 20px; width: 400px; height: 600px;',
        'top-left': 'top: 90px; left: 20px; width: 400px; height: 600px;',
      };
      iframeContainer.style.cssText += iframePositions[cfg.position] || iframePositions['bottom-right'];
    }

    // Create close button for iframe
    const closeButton = document.createElement('button');
    closeButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    closeButton.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.1);
      border: none;
      color: #333;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      transition: background 0.2s;
    `;
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.background = 'rgba(0, 0, 0, 0.2)';
    });
    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.background = 'rgba(0, 0, 0, 0.1)';
    });

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = iframeUrl;
    iframe.style.cssText = 'width: 100%; height: 100%; border: none; display: block;';
    iframe.setAttribute('allow', 'clipboard-write');
    iframe.setAttribute('title', 'Chat Widget');

    // Assemble widget
    iframeContainer.appendChild(closeButton);
    iframeContainer.appendChild(iframe);
    widgetContainer.appendChild(toggleButton);
    widgetContainer.appendChild(iframeContainer);
    document.body.appendChild(widgetContainer);

    // Toggle button hover effects
    toggleButton.addEventListener('mouseenter', () => {
      toggleButton.style.transform = 'scale(1.05)';
      toggleButton.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2)';
    });
    toggleButton.addEventListener('mouseleave', () => {
      toggleButton.style.transform = 'scale(1)';
      toggleButton.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    });

    // Toggle functionality
    toggleButton.addEventListener('click', () => {
      isOpen = !isOpen;
      if (isOpen) {
        iframeContainer.style.display = 'block';
        toggleButton.style.display = 'none';
        unreadCount = 0;
        unreadBadge.style.display = 'none';

        window.postMessage({ type: 'chat:open' }, '*');
      } else {
        iframeContainer.style.display = 'none';
        toggleButton.style.display = 'flex';

        window.postMessage({ type: 'chat:close' }, '*');
      }
    });

    closeButton.addEventListener('click', () => {
      isOpen = false;
      iframeContainer.style.display = 'none';
      toggleButton.style.display = 'flex';

      window.postMessage({ type: 'chat:close' }, '*');
    });

    // Listen for messages from iframe
    window.addEventListener('message', (event) => {
      handleIframeMessage(event);

      if (event.data.type === 'chat:message' && !isOpen) {
        unreadCount++;
        unreadBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
        unreadBadge.style.display = 'flex';
      }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      if (window.innerWidth <= 768) {
        iframeContainer.style.cssText = iframeContainer.style.cssText.replace(
          /top:.*?;|left:.*?;|right:.*?;|bottom:.*?;|width:.*?;|height:.*?;/g,
          ''
        );
        iframeContainer.style.cssText += `
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
          border-radius: 0;
        `;
      }
    });
  }
})();
