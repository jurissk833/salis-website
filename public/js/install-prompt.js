/**
 * Smart PWA Install Prompt Logic for Salis
 * Handles deferred install pormpts for Android and custom instructions for iOS.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Configuration
    const COOLDOWN_HOURS = 24;
    const STORAGE_KEY = 'salis_install_prompt_dismissed';

    // DOM Elements
    const androidPrompt = document.getElementById('android-install-prompt');
    const iosPrompt = document.getElementById('ios-install-prompt');
    const closeBtns = document.querySelectorAll('.install-prompt-close');
    const installBtn = document.getElementById('native-install-btn');

    // State
    let deferredPrompt;

    // --- Helpers ---

    function shouldShowPrompt() {
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
            return false; // Already installed
        }

        const lastDismissed = localStorage.getItem(STORAGE_KEY);
        if (lastDismissed) {
            const timeSince = (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60);
            if (timeSince < COOLDOWN_HOURS) {
                return false; // In cooldown
            }
        }
        return true;
    }

    const dismissPrompt = (prompt) => {
        if (!prompt) return;
        prompt.classList.remove('visible');
        setTimeout(() => {
            // prompt.style.display = 'none'; // Handled by CSS
            prompt.classList.remove('active');
        }, 500); // 500ms matches CSS transition

        // Save dismissal to localStorage
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
    };

    const showPrompt = (prompt) => {
        if (!prompt) return;
        // prompt.style.display = 'block'; // Handled by CSS class now
        prompt.classList.add('active');
        // Small delay to allow display:block to apply before opacity transition
        setTimeout(() => {
            prompt.classList.add('visible');
        }, 10);
    };

    function isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    }

    // --- Event Listeners ---

    // 1. Android / Desktop (Native support)
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = e;

        // Show our custom UI
        showPrompt(androidPrompt);
    });

    // Handle "Install App" button click
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User response to the install prompt: ${outcome}`);
                deferredPrompt = null;
                dismissPrompt(androidPrompt); // Close banner after choice
            }
        });
    }

    // 2. iOS Detection (No native prompt, custom instructions)
    if (isIOS() && shouldShowPrompt()) {
        // Check if NOT in standalone mode
        // iOS doesn't fire beforeinstallprompt, so we check purely on environment
        showPrompt(iosPrompt);
    }

    // 3. Footer Buttons Logic
    const footerAndroidBtn = document.getElementById('footer-install-android');
    const footerIosBtn = document.getElementById('footer-install-ios');

    if (footerAndroidBtn) {
        footerAndroidBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User response to the install prompt: ${outcome}`);
                deferredPrompt = null;
            } else {
                // If native prompt isn't available (e.g., already installed or checking),
                // we can't force it. We could show the banner as a fallback or a tooltip.
                // For now, let's show the banner if it's not visible.
                showPrompt(androidPrompt);
            }
        });
    }

    if (footerIosBtn) {
        footerIosBtn.addEventListener('click', () => {
            // Always show the instructions banner for iOS button click
            // even if it was dismissed previously (user explicitly asked for it)
            if (iosPrompt) {
                // iosPrompt.style.display = 'block';
                iosPrompt.classList.add('active');
                setTimeout(() => {
                    iosPrompt.classList.add('visible');
                }, 100);
            }
        });
    }

    // Close buttons
    closeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const prompt = e.target.closest('.install-prompt-banner');
            dismissPrompt(prompt);
        });
    });
});
