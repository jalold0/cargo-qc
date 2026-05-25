# Cargo QC — Design System

Yagona ko'rinish va xulq-atvor uchun barcha sahifalar shu komponentlardan foydalanishi kerak. Tailwind class'larini bevosita yozmaslik tavsiya etiladi — yangi shaklga ehtiyoj bo'lsa, avval bu yerga komponent qo'shing.

## Asoslar

| Fayl | Mazmun |
|------|--------|
| `tokens.js` | Ranglar, spacing, typography, shadows — **yagona manba** |
| `index.js` | Barcha komponentlarni eksport qiladi |

```js
import { Button, Card, PageLayout, PageHeader } from '../design';
```

`tailwind.config.js` shu tokenlardan import qiladi. Yangi rang qo'shish kerak bo'lsa — `tokens.js`'ga qo'shing, Tailwind avtomatik ko'radi.

## Tokens (qisqacha)

### Ranglar

```js
colors.brand    // Asosiy harakat rangi (Indigo)
colors.neutral  // Matn, ramka, fon (Slate)
colors.success  // Yashil (yopildi, tasdiqlangan)
colors.warning  // Sariq/to'q sariq (jarayonda, kechikgan)
colors.danger   // Qizil (xatolik, o'chirish)
colors.info     // Ko'k (ma'lumot, yangi)
```

Tailwind'da: `bg-brand-600`, `text-success-700`, `ring-danger-300`

### Radii

```js
sm: 4px    // chip
md: 8px    // input, button
lg: 12px   // card, modal — DEFAULT
xl: 16px   // hero card
```

### Spacing — 4px grid (Tailwind 1..20)

## Atomic komponentlar

### `<Button>`
```jsx
<Button>Saqlash</Button>
<Button variant="secondary" size="sm">Bekor</Button>
<Button variant="danger" loading>O'chirilmoqda</Button>
<Button leftIcon={Plus}>Yangi</Button>
<Button iconOnly aria-label="Yopish"><X /></Button>
```
Variants: `primary` (default) | `secondary` | `ghost` | `danger` | `success`
Sizes: `sm` | `md` (default) | `lg`

### `<Badge>`
```jsx
<Badge>Yangi</Badge>
<Badge variant="success">Yopildi</Badge>
<Badge variant="warning" tone="solid">Kechikgan</Badge>
```
Variants: `neutral` | `brand` | `success` | `warning` | `danger` | `info`
Tones: `soft` (default) | `solid` | `outline`

### `<Card>`
```jsx
<Card>
  <Card.Header>Sarlavha</Card.Header>
  <Card.Body>...</Card.Body>
  <Card.Footer>...</Card.Footer>
</Card>

<Card interactive onClick={...}>Klikli kartochka</Card>
```

### `<Input>`, `<Textarea>`, `<Select>`
```jsx
<Input label="Ism" required placeholder="Familiya Ism" />
<Input label="Email" type="email" error="Email noto'g'ri" />
<Textarea label="Izoh" rows={4} hint="500 belgigacha" />
<Select label="Status">
  <option>Yangi</option>
  <option>Yopildi</option>
</Select>
```

## Layout komponentlar

### `<PageLayout>` — barcha sahifalar shu wrapper ichida
```jsx
<PageLayout maxWidth="7xl">
  <PageHeader title="..." />
  <Section>...</Section>
</PageLayout>
```

### `<PageHeader>` — sarlavha + actions
```jsx
<PageHeader
  title="Murojaatlar"
  subtitle="OTK ish maydoni"
  icon={MessageSquare}
  actions={<Button leftIcon={Plus}>Yangi murojaat</Button>}
/>
```

### `<Section>` — sarlavhali bo'lim
```jsx
<Section title="Statistika" subtitle="2026-yil" actions={<Button size="sm">Eksport</Button>}>
  ...
</Section>

<Section variant="bare">  // hech qanday rang, ramka — faqat sarlavha
  ...
</Section>
```

### `<Toolbar>` — filter/qidiruv satri
```jsx
<Toolbar
  start={<Input placeholder="Qidiruv..." />}
  middle={<><Select>...</Select><Select>...</Select></>}
  end={<Button>Yangi</Button>}
/>
```

## State komponentlar

### `<EmptyState>`
```jsx
<EmptyState
  title="Hali murojaat yo'q"
  description="Yangi murojaat yaratish uchun yuqoridagi tugmadan foydalaning"
  action={<Button>Yangi qo'shish</Button>}
/>
```

### `<LoadingState>`
```jsx
<LoadingState message="Ma'lumotlar yuklanmoqda..." />
```

### `<ErrorState>`
```jsx
<ErrorState
  title="Server bilan ulanish yo'qotildi"
  description="Qayta urinib ko'ring yoki administrator bilan bog'laning"
  onRetry={() => refetch()}
/>
```

## Modal

```jsx
<Modal isOpen={open} onClose={close} title="Sarlavha" size="md">
  <Modal.Body>
    <Input label="Nom" />
  </Modal.Body>
  <Modal.Footer>
    <Button variant="ghost" onClick={close}>Bekor qilish</Button>
    <Button onClick={save}>Saqlash</Button>
  </Modal.Footer>
</Modal>
```

**A11y:** `role="dialog"`, `aria-modal`, `aria-labelledby`, focus trap, ESC orqali yopish, body scroll lock.

Sizes: `sm` (400px) | `md` (600px) | `lg` (800px) | `xl` (1100px)

## Migration qoidalari

1. **Mavjud sahifani qayta yozayotganda** — har bir `<button>`, `<div className="rounded-2xl...">`, `<input>` ni ekvivalent design komponentiga almashtir
2. **Yangi sahifa qo'shayotganda** — faqat shu yerdagi komponentlardan foydalan
3. **Yangi pattern kerak bo'lsa** — avval bu yerga qo'sh, keyin sahifada ishlat (DRY)
4. **Tailwind class'lar** — `mx-auto`, `flex`, `gap-*`, `grid` kabi layout class'lar bevosita ishlatilishi mumkin, lekin rang/border/shadow tokenlar orqali bo'lishi kerak

## Kelajak

- [ ] `<Table>` — yagona jadval (sortable, filterable)
- [ ] `<Tabs>` — tab navigatsiya
- [ ] `<DropdownMenu>` — kontekstli menyu
- [ ] `<Tooltip>` — hover yordami
- [ ] `<Avatar>` — foydalanuvchi rasmi
- [ ] `<Pagination>` — sahifalash
