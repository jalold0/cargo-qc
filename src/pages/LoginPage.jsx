import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuthStore, useLanguageStore } from '../store/authStore';
import { useT } from '../i18n';
import { CheckCircle2, Eye, EyeOff, Lock, ShieldCheck, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import loginLogo from '../assets/login-logo-transparent.png';

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
    const [result] = await Promise.all([
      login(username, password),
      wait(2000),
    ]);
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
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-slate-950 p-10 text-white lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.22),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(99,102,241,0.28),transparent_30%),linear-gradient(135deg,#020617,#0f172a)]" />
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <h1 className="mt-8 max-w-md text-4xl font-semibold tracking-tight">
                {t('heroTitle')}
              </h1>
              <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">
                {t('heroSubtitle')}
              </p>
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
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/8 p-3 ring-1 ring-white/10">
                  <CheckCircle2 size={18} className="text-cyan-300" />
                  <span className="text-sm text-slate-100">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center p-5 sm:p-8">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center lg:text-left">
              <div className="mb-4 flex justify-center lg:justify-end">
                <select
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                >
                  <option value="uz">UZ</option>
                  <option value="ru">RU</option>
                  <option value="en">ENG</option>
                </select>
              </div>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950 lg:mx-0">
                <ShieldCheck size={24} />
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">iPOST</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{t('loginTitle')}</h2>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Field label={t('username')} error={errors.username?.message}>
                <div className="relative">
                  <User size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    {...register('username', { required: t('usernameRequired') })}
                    placeholder="operator1"
                    autoComplete="username"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-800"
                  />
                </div>
              </Field>

              <Field label={t('password')} error={errors.password?.message}>
                <div className="relative">
                  <Lock size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password', { required: t('passwordRequired') })}
                    placeholder="op123"
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-11 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>

              <button
                type="submit"
                disabled={isLoading || logoLoading}
                className="flex h-14 w-full items-center justify-center overflow-hidden rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
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
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-400 lg:text-left">
              © {format(new Date(), 'dd.MM.yyyy')} {t('appName')} - Cargo QC System
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
    </div>
  );
}
