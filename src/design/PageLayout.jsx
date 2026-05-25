import { clsx } from 'clsx';

// ============================================================
// PageLayout — sahifa darajasidagi konteyner
// ------------------------------------------------------------
// Har bir sahifa shu wrapper ichida bo'lishi kerak. Yagona
// padding, max-width va vertical spacing.
//
// Namuna:
//   <PageLayout>
//     <PageHeader title="Murojaatlar" />
//     <Section>...</Section>
//     <Section>...</Section>
//   </PageLayout>
// ============================================================

export function PageLayout({ children, className = '', maxWidth = '7xl', ...rest }) {
  const widthClass = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-5xl',
    xl: 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-none',
  }[maxWidth];

  return (
    <div
      className={clsx(
        'mx-auto w-full px-4 py-6 sm:px-6 lg:px-8',
        'flex flex-col gap-6',
        widthClass,
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export default PageLayout;
