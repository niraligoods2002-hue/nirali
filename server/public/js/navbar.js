document.addEventListener('DOMContentLoaded', () => {
  const menuBtn = document.getElementById('menu-btn');
  const nav = document.getElementById('main-nav');
  const userBtn = document.getElementById('user-btn');
  const dropdown = document.getElementById('user-dropdown');
  const logoutBtns = document.querySelectorAll('#nav-logout, #mobile-logout');
  const themeToggle = document.getElementById('theme-toggle');
  const searchToggle = document.getElementById('search-toggle');
  const headerSearch = document.getElementById('header-search');
  const searchInput = document.getElementById('header-search-input');

  const getLoginRedirect = (fallback) => {
    const redirectParam = new URLSearchParams(window.location.search).get('redirect');
    if (redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')) {
      return redirectParam;
    }
    return localStorage.getItem('redirectAfterLogin') || fallback;
  };

  const goToEmailVerification = (email) => {
    localStorage.setItem('pendingVerificationEmail', email);
    const redirect = getLoginRedirect('/');
    localStorage.setItem('redirectAfterLogin', redirect);
    window.location.href = `/verify-email?email=${encodeURIComponent(email)}`;
  };

  const applyTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('nirali-theme', theme);
    if (themeToggle) {
      const isDark = theme === 'dark';
      themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
      themeToggle.setAttribute('title', isDark ? 'Light mode' : 'Dark mode');
    }
  };

  if (themeToggle) {
    applyTheme(document.documentElement.dataset.theme || 'dark');
    themeToggle.addEventListener('click', () => {
      applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    });
  }

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

  // Mobile menu
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', () => {
      nav.classList.toggle('open');
    });
  }

  // User dropdown
  if (userBtn && dropdown) {
    userBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });

    document.addEventListener('click', () => {
      dropdown.classList.remove('open');
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
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.requiresVerification && data.email) {
            goToEmailVerification(data.email);
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
        alert(err.message);
      }
    });
  }

  // Signup form
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
      }

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Signup failed');

        if (data.requiresVerification && data.email) {
          goToEmailVerification(data.email);
          return;
        }

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        const redirect = getLoginRedirect('/');
        localStorage.removeItem('redirectAfterLogin');
        window.location.href = redirect;
      } catch (err) {
        alert(err.message);
      }
    });
  }

  // Email OTP verification
  const verifyEmailForm = document.getElementById('verify-email-form');
  if (verifyEmailForm) {
    const emailInput = document.getElementById('verify-email');
    const otpInput = document.getElementById('verify-otp');
    const resendBtn = document.getElementById('resend-otp');
    const emailFromUrl = new URLSearchParams(window.location.search).get('email');
    emailInput.value = emailFromUrl || localStorage.getItem('pendingVerificationEmail') || '';

    verifyEmailForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: emailInput.value,
            otp: otpInput.value
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Email verification failed');

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.removeItem('pendingVerificationEmail');
        const redirect = getLoginRedirect('/');
        localStorage.removeItem('redirectAfterLogin');
        window.location.href = redirect;
      } catch (err) {
        alert(err.message);
      }
    });

    resendBtn?.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/auth/resend-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailInput.value })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Could not resend OTP');
        alert(data.message || 'OTP sent');
      } catch (err) {
        alert(err.message);
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
        const data = await response.json();
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
        const data = await response.json();
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
        const data = await res.json();
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
    let activeSlide = 0;

    const showSlide = (index) => {
      activeSlide = index;
      slides.forEach((slide, slideIndex) => {
        slide.classList.toggle('active', slideIndex === activeSlide);
      });
      dots.forEach((dot, dotIndex) => {
        dot.classList.toggle('active', dotIndex === activeSlide);
      });
    };

    dots.forEach((dot) => {
      dot.addEventListener('click', () => showSlide(Number(dot.dataset.slideDot)));
    });

    if (slides.length > 1) {
      setInterval(() => {
        showSlide((activeSlide + 1) % slides.length);
      }, 5200);
    }
  }

  // Update cart count
  updateCartCount();
});

function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem('luxora_cart') || '[]');
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const badge = document.getElementById('cart-count');
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}

// Expose for widgets
window.updateCartCount = updateCartCount;
