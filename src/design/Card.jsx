import { clsx } from 'clsx';

// ============================================================
// Card — yagona ko'rinishdagi konteyner
// ------------------------------------------------------------
// Slots: <Card.Header>, <Card.Body>, <Card.Footer>
// Padding (default md): none | sm | md | lg
//
// Namuna:
//   <Card>
//     <Card.Header>
//       <h3>Sarlavha</h3>
//     </Card.Header>
//     <Card.Body>...</Card.Body>
//     <Card.Footer>...</Card.Footer>
//   </Card>
//
//   <Card interactive onClick={...}>Bosish mumkin</Card>
// ============================================================

const PADDING_CLASS = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({
  children,
  padding = 'md',
  interactive = false,
  as: As = 'div',
  className = '',
  ...rest
}) {
  return (
    <As
      className={clsx(
        // base
        'rounded-lg bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800',
        // shadow
        'shadow-sm',
        // padding (faqat asosiy darajada — slots o'ziniki bor)
        padding !== 'none' && !hasSlots(children) && PADDING_CLASS[padding],
        // interactive (klikli kartochkalar)
        interactive &&
          'cursor-pointer transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
        className,
      )}
      {...rest}
    >
      {children}
    </As>
  );
}

// Slots — pastda export qilamiz, lekin Card.Header sifatida ham ishlatilsin
function CardHeader({ children, className = '', divider = true, ...rest }) {
  return (
    <div
      className={clsx(
        'flex items-center justify-between gap-3 px-4 py-3',
        divider && 'border-b border-slate-200 dark:border-slate-800',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

function CardBody({ children, className = '', ...rest }) {
  return (
    <div className={clsx('px-4 py-4', className)} {...rest}>
      {children}
    </div>
  );
}

function CardFooter({ children, className = '', divider = true, ...rest }) {
  return (
    <div
      className={clsx(
        'flex items-center justify-end gap-2 px-4 py-3',
        divider && 'border-t border-slate-200 dark:border-slate-800',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

// React children'i orasida slot bor-yo'qligini aniqlash
// (agar Header/Body/Footer ishlatilgan bo'lsa, asosiy padding'ni o'chiramiz)
function hasSlots(children) {
  if (!children) return false;
  const arr = Array.isArray(children) ? children : [children];
  return arr.some(
    (child) =>
      child &&
      typeof child === 'object' &&
      (child.type === CardHeader || child.type === CardBody || child.type === CardFooter),
  );
}

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export { CardHeader, CardBody, CardFooter };
export default Card;
