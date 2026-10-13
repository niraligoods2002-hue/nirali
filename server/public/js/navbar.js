document.addEventListener('DOMContentLoaded', () => {
  const menuBtn = document.getElementById('menu-btn');
  const nav = document.getElementById('main-nav');
  const userBtn = document.getElementById('user-btn');
  const dropdown = document.getElementById('user-dropdown');
  const logoutBtns = document.querySelectorAll('#nav-logout, #mobile-logout');
  const searchToggle = document.getElementById('search-toggle');
  const headerSearch = document.getElementById('header-search');
  const searchInput = document.getElementById('header-search-input');

  const getLoginRedirect = (fallback) => {
    const redirectParam = new URLSearchParams(window.location.search).get('redirect');
    const storedRedirect = localStorage.getItem('redirectAfterLogin');
    const authPages = new Set(['/login', '/signup', '/verify-email', '/forgot-password', '/reset-password']);
    const isSafeRedirect = (value) => {
      if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return false;
      try {
        const target = new URL(value, window.location.origin);
        return target.origin === window.location.origin && !authPages.has(target.pathname);
      } catch {
        return false;
      }
    };

    if (isSafeRedirect(redirectParam)) return redirectParam;
    if (isSafeRedirect(storedRedirect)) return storedRedirect;
    return fallback;
  };

  const otpCooldownKey = (email) => `otpCooldownUntil:${String(email || '').trim().toLowerCase()}`;

  const goToEmailVerification = (email, cooldownSeconds = 60) => {
    localStorage.setItem('pendingVerificationEmail', email);
    localStorage.setItem(otpCooldownKey(email), String(Date.now() + cooldownSeconds * 1000));
    const redirect = getLoginRedirect('/');
    localStorage.setItem('redirectAfterLogin', redirect);
    window.location.href = `/verify-email?email=${encodeURIComponent(email)}`;
  };

  const readApiResponse = async (response) => {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) return response.json();

    await response.text();
    throw new Error(
      response.status >= 500
        ? 'The server is temporarily unavailable. Please wait a moment and try again.'
        : `The server returned an unexpected response (${response.status}).`
    );
  };

  // Product search
  if (searchToggle && headerSearch && searchInput) {
    searchToggle.addEventListener('click', () => {
      const isOpen = headerSearch.classList.toggle('open');
      searchToggle.setAttribute('aria-expanded', String(isOpen));
      if (isOpen) searchInput.focus();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && headerSearch.classList.contains('open')) {
        headerSearch.classList.remove('open');
        searchToggle.setAttribute('aria-expanded', 'false');
        searchToggle.focus();
      }
    });
  }

  // Mega Menu Interactions (Desktop Click toggle, keyboard nav, outside click, Escape)
  const megaItems = document.querySelectorAll('.nav-item-mega');
  const megaTriggers = document.querySelectorAll('.nav-mega-trigger');

  const closeAllMegaMenus = () => {
    megaItems.forEach(item => {
      item.classList.remove('is-open');
      const trigger = item.querySelector('.nav-mega-trigger');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    });
  };

  megaTriggers.forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      const parent = trigger.closest('.nav-item-mega');
      if (!parent) return;
      const isOpen = parent.classList.contains('is-open');
      closeAllMegaMenus();
      if (!isOpen) {
        e.preventDefault();
        parent.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });

    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        const parent = trigger.closest('.nav-item-mega');
        if (parent) {
          closeAllMegaMenus();
          parent.classList.add('is-open');
          trigger.setAttribute('aria-expanded', 'true');
          const firstLink = parent.querySelector('.mega-menu a');
          if (firstLink) firstLink.focus();
        }
      }
    });
  });

  // Mobile Drawer Controls
  const mobileDrawer = document.getElementById('mobile-drawer');
  const mobileBackdrop = document.getElementById('mobile-nav-backdrop');
  const mobileDrawerClose = document.getElementById('mobile-drawer-close');

  const openMobileDrawer = () => {
    if (mobileDrawer) {
      mobileDrawer.classList.add('open');
      mobileDrawer.setAttribute('aria-hidden', 'false');
    }
    if (mobileBackdrop) {
      mobileBackdrop.classList.add('open');
      mobileBackdrop.setAttribute('aria-hidden', 'false');
    }
    if (menuBtn) {
      menuBtn.setAttribute('aria-expanded', 'true');
    }
    document.body.style.overflow = 'hidden';
  };

  const closeMobileDrawer = () => {
    if (mobileDrawer) {
      mobileDrawer.classList.remove('open');
      mobileDrawer.setAttribute('aria-hidden', 'true');
    }
    if (mobileBackdrop) {
      mobileBackdrop.classList.remove('open');
      mobileBackdrop.setAttribute('aria-hidden', 'true');
    }
    if (menuBtn) {
      menuBtn.setAttribute('aria-expanded', 'false');
    }
    document.body.style.overflow = '';
  };

  if (menuBtn) {
    menuBtn.addEventListener('click', openMobileDrawer);
  }
  if (mobileDrawerClose) {
    mobileDrawerClose.addEventListener('click', closeMobileDrawer);
  }
  if (mobileBackdrop) {
    mobileBackdrop.addEventListener('click', closeMobileDrawer);
  }

  // Mobile Accordion Items
  document.querySelectorAll('.mobile-accordion-trigger').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const item = trigger.closest('.mobile-accordion-item');
      if (!item) return;
      const isOpen = item.classList.contains('open');
      item.classList.toggle('open', !isOpen);
      trigger.setAttribute('aria-expanded', String(!isOpen));
    });
  });

  // Global dismiss handlers for dropdowns, mega menus, search, and drawer
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (headerSearch && headerSearch.classList.contains('open')) {
        headerSearch.classList.remove('open');
        if (searchToggle) {
          searchToggle.setAttribute('aria-expanded', 'false');
          searchToggle.focus();
        }
      }
      if (mobileDrawer && mobileDrawer.classList.contains('open')) {
        closeMobileDrawer();
      }
      closeAllMegaMenus();
      if (dropdown) dropdown.classList.remove('open');
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-item-mega')) {
      closeAllMegaMenus();
    }
    if (dropdown && !e.target.closest('#user-wrap')) {
      dropdown.classList.remove('open');
    }
  });

  // User dropdown
  if (userBtn && dropdown) {
    userBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });
  }

  // Logout
  logoutBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch {
        // Clear browser state even if the request cannot complete.
      }
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    });
  });

  // Password toggles
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.parentElement.querySelector('input');
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = 'Hide';
      } else {
        input.type = 'password';
        btn.textContent = 'Show';
      }
    });
  });

  // Login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    const status = document.getElementById('auth-status');
    const submitButton = loginForm.querySelector('button[type="submit"]');
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      submitButton.disabled = true;
      if (status) { status.className = 'auth-status'; status.textContent = 'Signing in...'; }

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await readApiResponse(res);
        if (!res.ok) {
          if (data.requiresVerification && data.email) {
            goToEmailVerification(data.email, data.retryAfter || 60);
            return;
          }
          throw new Error(data.message || 'Login failed');
        }

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        const redirect = getLoginRedirect(data.user.role === 'admin' ? '/admin' : '/');
        localStorage.removeItem('redirectAfterLogin');
        window.location.href = redirect;
      } catch (err) {
        if (status) { status.className = 'auth-status error'; status.textContent = err.message; }
      } finally {
        submitButton.disabled = false;
      }
    });
  }

  // Signup form
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    const status = document.getElementById('auth-status');
    const submitButton = signupForm.querySelector('button[type="submit"]');
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        if (status) { status.className = 'auth-status error'; status.textContent = 'Password must contain at least 8 characters, including a letter and a number'; }
        return;
      }
      submitButton.disabled = true;
      if (status) { status.className = 'auth-status'; status.textContent = 'Creating your account...'; }

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });
        const data = await readApiResponse(res);
        if (data.requiresVerification && data.email) {
          goToEmailVerification(data.email, data.retryAfter || 60);
          return;
        }
        if (!res.ok) throw new Error(data.message || 'Signup failed');

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        const redirect = getLoginRedirect('/');
        localStorage.removeItem('redirectAfterLogin');
        window.location.href = redirect;
      } catch (err) {
        if (status) { status.className = 'auth-status error'; status.textContent = err.message; }
      } finally {
        submitButton.disabled = false;
      }
    });
  }

  // Email OTP verification
  const verifyEmailForm = document.getElementById('verify-email-form');
  if (verifyEmailForm) {
    const emailInput = document.getElementById('verify-email');
    const otpInput = document.getElementById('verify-otp');
    const resendBtn = document.getElementById('resend-otp');
    const verifyStatus = document.getElementById('verify-status');
    const verifyButton = verifyEmailForm.querySelector('button[type="submit"]');
    const emailFromUrl = new URLSearchParams(window.location.search).get('email');
    emailInput.value = emailFromUrl || localStorage.getItem('pendingVerificationEmail') || '';
    let resendTimer;

    const startResendCountdown = (seconds) => {
      const cooldownUntil = Date.now() + Math.max(0, Number(seconds) || 0) * 1000;
      localStorage.setItem(otpCooldownKey(emailInput.value), String(cooldownUntil));
      clearInterval(resendTimer);

      const updateResendButton = () => {
        const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
        resendBtn.disabled = remaining > 0;
        resendBtn.textContent = remaining > 0 ? `Resend OTP in ${remaining}s` : 'Resend OTP';
        if (remaining === 0) clearInterval(resendTimer);
      };

      updateResendButton();
      resendTimer = setInterval(updateResendButton, 250);
    };

    const savedCooldownUntil = Number(localStorage.getItem(otpCooldownKey(emailInput.value)) || 0);
    if (savedCooldownUntil > Date.now()) {
      startResendCountdown(Math.ceil((savedCooldownUntil - Date.now()) / 1000));
    }

    verifyEmailForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      verifyButton.disabled = true;
      if (verifyStatus) { verifyStatus.className = 'auth-status'; verifyStatus.textContent = 'Verifying your email...'; }

      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: emailInput.value,
            otp: otpInput.value
          })
        });
        const data = await readApiResponse(res);
        if (!res.ok) throw new Error(data.message || 'Email verification failed');

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.removeItem('pendingVerificationEmail');
        const redirect = getLoginRedirect('/');
        localStorage.removeItem('redirectAfterLogin');
        window.location.href = redirect;
      } catch (err) {
        if (verifyStatus) { verifyStatus.className = 'auth-status error'; verifyStatus.textContent = err.message; }
      } finally {
        verifyButton.disabled = false;
      }
    });

    resendBtn?.addEventListener('click', async () => {
      resendBtn.disabled = true;
      if (verifyStatus) { verifyStatus.className = 'auth-status'; verifyStatus.textContent = 'Sending a new code...'; }
      try {
        const res = await fetch('/api/auth/resend-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailInput.value })
        });
        const data = await readApiResponse(res);
        if (!res.ok) {
          if (data.retryAfter) startResendCountdown(data.retryAfter);
          throw new Error(data.message || 'Could not resend OTP');
        }
        startResendCountdown(60);
        if (verifyStatus) { verifyStatus.className = 'auth-status success'; verifyStatus.textContent = data.message || 'A new verification code was sent.'; }
      } catch (err) {
        if (verifyStatus) { verifyStatus.className = 'auth-status error'; verifyStatus.textContent = err.message; }
        if (Number(localStorage.getItem(otpCooldownKey(emailInput.value)) || 0) <= Date.now()) resendBtn.disabled = false;
      }
    });
  }

  const forgotPasswordForm = document.getElementById('forgot-password-form');
  if (forgotPasswordForm) {
    const status = document.getElementById('forgot-password-status');
    forgotPasswordForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submitButton = forgotPasswordForm.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      status.className = 'auth-status';
      status.textContent = 'Sending reset link...';

      try {
        const response = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: document.getElementById('forgot-email').value })
        });
        const data = await readApiResponse(response);
        if (!response.ok) throw new Error(data.message || 'Could not send reset link');
        status.className = 'auth-status success';
        status.textContent = data.message;
        forgotPasswordForm.reset();
      } catch (error) {
        status.className = 'auth-status error';
        status.textContent = error.message;
      } finally {
        submitButton.disabled = false;
      }
    });
  }

  const resetPasswordForm = document.getElementById('reset-password-form');
  if (resetPasswordForm) {
    const status = document.getElementById('reset-password-status');
    const token = new URLSearchParams(window.location.search).get('token') || '';
    if (!token) {
      status.className = 'auth-status error';
      status.textContent = 'This reset link is incomplete. Request a new one.';
      resetPasswordForm.querySelector('button[type="submit"]').disabled = true;
    }

    resetPasswordForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const password = document.getElementById('reset-password').value;
      const confirmPassword = document.getElementById('reset-confirm-password').value;
      if (password !== confirmPassword) {
        status.className = 'auth-status error';
        status.textContent = 'Passwords do not match.';
        return;
      }

      const submitButton = resetPasswordForm.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      status.className = 'auth-status';
      status.textContent = 'Updating password...';

      try {
        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, password })
        });
        const data = await readApiResponse(response);
        if (!response.ok) throw new Error(data.message || 'Could not reset password');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        status.className = 'auth-status success';
        status.textContent = data.message;
        resetPasswordForm.reset();
        setTimeout(() => {
          window.location.href = '/login';
        }, 1600);
      } catch (error) {
        status.className = 'auth-status error';
        status.textContent = error.message;
        submitButton.disabled = false;
      }
    });
  }

  // Customer review form
  const reviewForm = document.getElementById('review-form');
  if (reviewForm) {
    const ratingInput = document.getElementById('review-rating');
    const starButtons = Array.from(document.querySelectorAll('.review-star-btn'));

    const paintStars = (rating) => {
      starButtons.forEach((button) => {
        const value = Number(button.dataset.rating);
        const active = value <= rating;
        button.classList.toggle('active', active);
        button.setAttribute('aria-checked', String(value === Number(ratingInput.value)));
      });
    };

    starButtons.forEach((button) => {
      button.addEventListener('click', () => {
        ratingInput.value = button.dataset.rating;
        paintStars(Number(ratingInput.value));
      });
      button.addEventListener('mouseenter', () => paintStars(Number(button.dataset.rating)));
      button.addEventListener('focus', () => paintStars(Number(button.dataset.rating)));
    });

    document.querySelector('.review-rating-buttons')?.addEventListener('mouseleave', () => {
      paintStars(Number(ratingInput.value));
    });

    reviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = reviewForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
      }

      try {
        const res = await fetch('/api/reviews', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`
          },
          body: JSON.stringify({
            rating: document.getElementById('review-rating').value,
            text: document.getElementById('review-text').value
          })
        });
        const data = await readApiResponse(res);
        if (!res.ok) throw new Error(data.message || 'Could not submit review');

        alert('Thank you! Your review has been submitted.');
        window.location.reload();
      } catch (err) {
        alert(err.message);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Review';
        }
      }
    });
  }

  // Home masterpiece hero slider
  const masterpieceSlider = document.querySelector('[data-masterpiece-slider]');
  if (masterpieceSlider) {
    const slides = Array.from(masterpieceSlider.querySelectorAll('[data-slide]'));
    const dots = Array.from(masterpieceSlider.querySelectorAll('[data-slide-dot]'));
    const previousButton = masterpieceSlider.querySelector('[data-slide-prev]');
    const nextButton = masterpieceSlider.querySelector('[data-slide-next]');
    let activeSlide = 0;
    let autoSlideTimer;
    let touchStartX = 0;

    const showSlide = (index) => {
      activeSlide = index;
      slides.forEach((slide, slideIndex) => {
        slide.classList.toggle('active', slideIndex === activeSlide);
        slide.setAttribute('aria-hidden', String(slideIndex !== activeSlide));
      });
      dots.forEach((dot, dotIndex) => {
        dot.classList.toggle('active', dotIndex === activeSlide);
        dot.setAttribute('aria-current', String(dotIndex === activeSlide));
      });
    };

    dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        showSlide(Number(dot.dataset.slideDot));
        restartAutoSlide();
      });
    });

    const startAutoSlide = () => {
      if (slides.length < 2) return;
      clearInterval(autoSlideTimer);
      autoSlideTimer = setInterval(() => {
        showSlide((activeSlide + 1) % slides.length);
      }, 5200);
    };

    const stopAutoSlide = () => clearInterval(autoSlideTimer);
    const restartAutoSlide = () => {
      stopAutoSlide();
      startAutoSlide();
    };

    previousButton?.addEventListener('click', () => {
      showSlide((activeSlide - 1 + slides.length) % slides.length);
      restartAutoSlide();
    });
    nextButton?.addEventListener('click', () => {
      showSlide((activeSlide + 1) % slides.length);
      restartAutoSlide();
    });

    masterpieceSlider.addEventListener('mouseenter', stopAutoSlide);
    masterpieceSlider.addEventListener('mouseleave', startAutoSlide);
    masterpieceSlider.addEventListener('touchstart', (event) => {
      touchStartX = event.touches[0]?.clientX || 0;
      stopAutoSlide();
    }, { passive: true });
    masterpieceSlider.addEventListener('touchend', (event) => {
      const touchEndX = event.changedTouches[0]?.clientX || 0;
      const distance = touchEndX - touchStartX;
      if (Math.abs(distance) > 45) {
        showSlide((activeSlide + (distance < 0 ? 1 : -1) + slides.length) % slides.length);
      }
      startAutoSlide();
    }, { passive: true });

    startAutoSlide();
  }

  // Update cart count
  updateCartCount();
});

function updateCartCount() {
  const rawCart = localStorage.getItem('nirali_cart') || localStorage.getItem('luxora_cart') || '[]';
  let cart = [];
  try {
    cart = JSON.parse(rawCart);
  } catch {
    cart = [];
  }
  const count = Array.isArray(cart) ? cart.reduce((sum, item) => sum + (Number(item?.quantity) || 1), 0) : 0;
  const badge = document.getElementById('cart-count');
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}

// Expose for widgets
window.updateCartCount = updateCartCount;
