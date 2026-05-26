import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuthStore, useLanguageStore } from '../store/authStore';
import { useT } from '../i18n';
import { CheckCircle2, Eye, EyeOff, Lock, ShieldCheck, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Button, Input, Select } from '../design';
import { APP_VERSION } from '../services/appVersion';
import loginLogo from '../assets/login-logo-transparent.png';

// ============================================================
// LoginPage — design system'ning birinchi sinov sahifasi
// ------------------------------------------------------------
// Eski versiyada inline Tailwind class'lar va custom Field
// komponenti ishlatilgan. Endi to'liq design system orqali:
//   - Button (loading state bilan)
//   - Input (leftIcon va rightAddon bilan)
//   - Select (til tanlovi uchun)
// ============================================================

export default function LoginPage() {
  const t = useT();
  const [showPassword, setShowPassword] = useState(false);
  const [logoLoading, setLogoLoading] = useState(false);
  const { language, setLanguage } = useLanguageStore();
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async ({ username, password }) => {
    setLogoLoading(true);
    const [result] = await Promise.all([login(username, password), wait(2000)]);
    setLogoLoading(false);

    if (result.success) {
      toast.success(t('welcome'));
      navigate('/dashboard');
    } else {
      toast.error(result.message || t('invalidLogin'));
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Chap panel — brending va tasvir (faqat desktop) */}
        <section className="relative hidden overflow-hidden bg-slate-950 p-10 text-white lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.22),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(99,102,241,0.28),transparent_30%),linear-gradient(135deg,#020617,#0f172a)]" />
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <h1 className="mt-8 max-w-md text-4xl font-bold tracking-tight">{t('heroTitle')}</h1>
              <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">{t('heroSubtitle')}</p>
            </div>

            <div className="flex flex-1 items-center justify-center py-6">
              <img
                src={loginLogo}
                alt="iPOST"
                className="w-full max-w-[340px] object-contain opacity-95 drop-shadow-[0_18px_36px_rgba(15,23,42,0.26)]"
              />
            </div>

            <div className="grid gap-3">
              {[t('featureRealtime'), t('featureRoles'), t('featureDemo')].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-lg bg-white/10 p-3 ring-1 ring-white/10"
                >
                  <CheckCircle2 size={18} className="text-cyan-300" aria-hidden="true" />
                  <span className="text-sm text-slate-100">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* O'ng panel — login forma */}
        <section className="flex items-center justify-center p-5 sm:p-8">
          <div className="w-full max-w-md">
            {/* Til tanlovi + logo */}
            <div className="mb-8 text-center lg:text-left">
              <div className="mb-4 flex justify-center lg:justify-end">
                <Select
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className="w-auto"
                  aria-label="Til"
                >
                  <option value="uz">UZ</option>
                  <option value="ru">RU</option>
                  <option value="en">ENG</option>
                </Select>
              </div>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950 lg:mx-0">
                <ShieldCheck size={24} aria-hidden="true" />
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">iPOST</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {t('loginTitle')}
              </h2>
            </div>

            {/* Forma */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <Input
                label={t('username')}
                placeholder="ism.familiya"
                autoComplete="username"
                required
                leftIcon={User}
                error={errors.username?.message}
                {...register('username', { required: t('usernameRequired') })}
              />

              <Input
                label={t('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="op123"
                autoComplete="current-password"
                required
                leftIcon={Lock}
                error={errors.password?.message}
                rightAddon={
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                }
                {...register('password', { required: t('passwordRequired') })}
              />

              <Button
                type="submit"
                size="lg"
                fullWidth
                disabled={isLoading || logoLoading}
                aria-busy={isLoading || logoLoading || undefined}
                className="!h-14 !rounded-xl"
              >
                {logoLoading ? (
                  <span className="relative flex h-7 w-24 items-center justify-center overflow-hidden">
                    <img
                      src={loginLogo}
                      alt="iPOST loading"
                      className="animate-login-logo absolute h-5 w-auto object-contain"
                    />
                  </span>
                ) : (
                  t('login')
                )}
              </Button>
            </form>

            <div className="mt-6 flex flex-col items-center justify-between gap-1 text-xs text-slate-400 lg:flex-row lg:text-left">
              <p>© {format(new Date(), 'dd.MM.yyyy')} {t('appName')} — Cargo QC System</p>
              <span className="font-mono tabular-nums">v{APP_VERSION}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
