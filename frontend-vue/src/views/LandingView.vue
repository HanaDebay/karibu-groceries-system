<template>
  <section class="landing-page">
    <div class="overlay"></div>
    <main class="content">
      <img src="/images/logo.png" alt="Karibu Groceries Logo" class="logo" />
      <h1>Karibu Groceries System</h1>
      <p class="subtitle">Stock, sales, and credit control for every branch in one place.</p>

      <div class="actions">
        <router-link class="btn btn-primary" :to="{ name: 'login' }">Proceed to Login</router-link>
      </div>
    </main>
  </section>
</template>

<style scoped>
.landing-page {
  min-height: 100vh;
  position: relative;
  display: grid;
  place-items: center;
  background: url('/images/bg1.jpg') center / cover no-repeat;
  padding: 24px;
}

.overlay {
  position: absolute;
  inset: 0;
  background: rgba(12, 20, 27, 0.62);
}

.content {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 760px;
  text-align: center;
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 36px 24px;
  backdrop-filter: blur(8px);
}

.logo {
  width: 84px;
  height: 84px;
  border-radius: 50%;
  object-fit: cover;
  margin: 0 auto 16px;
}

h1 {
  margin: 0;
  font-size: clamp(30px, 4vw, 44px);
  line-height: 1.15;
}

.subtitle {
  margin: 14px auto 0;
  max-width: 560px;
  opacity: 0.95;
  font-size: clamp(15px, 2vw, 19px);
}

.actions {
  margin-top: 24px;
}

.btn {
  display: inline-block;
  border-radius: 10px;
  padding: 12px 20px;
  text-decoration: none;
  font-weight: 700;
}

.btn-primary {
  background: #d4af37;
  color: #1a202c;
}

.btn-primary:hover {
  background: #2c3e50;
  color: #fff;
}
</style>
