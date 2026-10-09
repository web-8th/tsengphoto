---
description: Project-wide coding instructions for Copilot
applyTo: '**/*'
---

# Copilot Project Instructions

---

## Project Overview

### Stack

- **Framework:** Next.js 15 (App Router)
- **Backend:** Supabase (PostgreSQL)
- **File Uploads:** UploadThing
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Shadcn UI + Animate-UI
- **Authentication:** Supabase Auth

### Project Structure

```
app/                    # Next.js App Router pages and API routes
  ├── api/v1/          # API endpoints (versioned)
  ├── admin/           # Protected admin pages (still in testing...)
  └── ...              # Public pages

components/
  ├── ui/             # Shadcn UI components
  ├── animate-ui/     # Animated Shadcn variants (prefer these)
  └── ...             # Feature components

services/              # Business logic layer (*.service.ts)
lib/types/             # TypeScript type definitions
utils/supabase/        # Supabase client configs (client, server, admin, proxy)
proxy.ts               # Next.js middleware (route protection)
supabase/migrations/   # Database migrations
```

### Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # Server-side only, never expose to client
UPLOADTHING_TOKEN=
UPLOADTHING_APP_ID=                 # Used in next.config.ts for image optimization
NEXT_PUBLIC_SITE_URL=               # Optional, used for UploadThing callbacks on Vercel
```

---

## Architecture

This project follows a strict 3-layer architecture:

### 1. UI Layer (Components)

- React components in `/components/` and `/app/`
- No business logic, no direct Supabase calls, no API calls to service layer
- Call API routes for all data operations
- Handle loading/error states via toast notifications

### 2. Service Layer (`/services/*.service.ts`)

- Pure business logic only (validation, transformations, calculations)
- No direct database/Supabase calls
- Acts as a bridge between API routes and data operations
- Returns structured responses: `{ success: boolean, data?: T, error?: string }`
- Never exposes raw errors to callers

```typescript
// services/uploads.service.ts
export async function processUploadData(upload: Upload): Upload {
  // Business logic: transform, validate, calculate
  return {
    ...upload,
    file_size_mb: upload.file_size / 1024 / 1024,
  };
}
```

### 3. API / Route Layer (`/app/api/`)

- Authentication + input validation
- Direct Supabase/database calls
- Calls service layer for business logic
- Returns safe, sanitized responses
- Uses Logger for server-side error logging

```typescript
// app/api/v1/uploads/route.ts
export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('uploads').select('*');

    if (error) {
      Logger.error('Error fetching uploads:', error);
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    Logger.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
```

---

## Preferences

### Navigation — Prefer `<Link>` Over `<a>`

Always use Next.js `<Link>` for internal navigation. Only use `<a>` for external URLs.

```tsx
//  Internal navigation
import Link from 'next/link';
<Link href='/admin'>Dashboard</Link>

//  External links only
<a href='https://example.com' target='_blank' rel='noopener noreferrer'>External</a>

//  Never use <a> for internal routes
<a href='/admin'>Dashboard</a>
```

### Components — Prefer Animate-UI → Shadcn → Custom

1. **Animate-UI** (`/components/animate-ui/`) — animated Shadcn variants, always prefer
2. **Shadcn UI** (`/components/ui/`) — fallback for components not in animate-ui
3. **Custom** — only when neither option exists

```tsx
//  Prefer animate-ui
import { Button, Dialog, Checkbox } from '@/components/animate-ui/components';

//  Shadcn fallback
import { Card, Input, Skeleton } from '@/components/ui';

//  Never build custom when a component already exists
```

### Typography — Always Use `<Text>`

Use the `Text` component for all text. Never use raw `h1`/`p`/`span` with manual classes.

```tsx
import { Text } from '@/components/Text';

<Text variant='hd-xxl'>Page Title</Text>      // → <h1>
<Text variant='hd-xl'>Section</Text>          // → <h2>
<Text variant='hd-lg'>Card Title</Text>       // → <h3>
<Text variant='bd-md'>Body text</Text>        // → <p> (default)
<Text variant='muted'>De-emphasized</Text>    // → <span>
<Text variant='label'>Form label</Text>       // → <label>
<Text variant='caption'>Footnote</Text>       // → <span>
```

Heading variants: `hd-xxl` → `hd-xs` (responsive, bold, semantic HTML auto-applied)
Body variants: `bd-xxl` → `bd-xs` (responsive)
Special: `caption`, `label`, `muted`, `muted-sm`

### Loading States — Prefer TanStack Query, Fall Back to Global Context

**Prefer TanStack Query's built-in loading states** (`isPending`, `isLoading`, `isSuccess`) whenever the async operation is a query or mutation. Only reach for `useLoading()` when the operation falls outside TanStack Query (e.g. a one-off imperative action with no query/mutation).

#### Client Component Loading - Use `loading.tsx`

For pages with client-side TanStack Query data fetching, create a `loading.tsx` file and reuse it in the component's `isLoading` state. Never duplicate the skeleton markup.

```tsx
//  app/collections/[slug]/loading.tsx
export default function CollectionLoading() {
  return (
    <section className='container mx-auto px-4 pb-4 nb-padding'>
      <Skeleton className='h-10 w-40 mb-8' />
      <div className='mb-12 space-y-6'>
        <Skeleton className='h-6 w-20' />
        <Skeleton className='h-12 w-96' />
      </div>
    </section>
  );
}

//  app/collections/[slug]/page.tsx - Reuse the loading component
import CollectionLoading from './loading';

export default function CollectionPage() {
  const { data, isLoading } = useQuery({ ... });

  if (isLoading) {
    return <CollectionLoading />;
  }

  // render page with data...
}

//  Don't duplicate skeleton markup inline
if (isLoading) {
  return <Skeleton className='h-10 w-40 mb-8' />;  // Don't duplicate
}
```

#### Mutation and Query Loading

```tsx
//  TanStack Query mutation loading
const deleteMutation = useMutation({ ... });

<Button disabled={deleteMutation.isPending}>
  {deleteMutation.isPending ? <><Spinner /> Deleting...</> : 'Delete'}
</Button>

//  TanStack Query query loading
const { data, isLoading } = useQuery({ ... });

{isLoading ? <Skeleton className='h-4 w-32' /> : <span>{data.count} items</span>}

//  Fallback — use LoadingContext only when no TanStack Query is involved
const { setLoading, isLoading } = useLoading();

setLoading('user:save', true);
try {
  await someImperativeAction();
} finally {
  setLoading('user:save', false);
}

//  Never use local useState for loading under any circumstance
const [loading, setLoading] = useState(false);
```

Context from `@/context/LoadingContext.tsx` provides: `setLoading(key, value)`, `isLoading(key)`, `isAnyLoading()`, `loadingStates`.

**Skeleton** for data-dependent content (text, cards, images):

```tsx
// From TanStack Query
const { isLoading } = useQuery({ ... });
{isLoading ? <Skeleton className='h-4 w-32' /> : <span>{count} items</span>}

//  For staggered animations, wrap Skeleton in a container div
<div className={`fade-in-from-bottom ${getDelayClass(i)}`}>
  <Skeleton className='h-80 w-full rounded-xl' />
</div>

//  Don't apply animation classes directly to Skeleton (conflicts with pulse)
<Skeleton className={`h-80 w-full fade-in-from-bottom ${getDelayClass(i)}`} />
```

**Spinner** for action-based operations (buttons, form submissions):

```tsx
// From TanStack Query mutation
<Button disabled={mutation.isPending || mutation.isSuccess}>
  {mutation.isPending || mutation.isSuccess ? (
    <>
      <Spinner /> Saving...
    </>
  ) : (
    'Save'
  )}
</Button>
```

### Empty States — Use `EmptyState`

```tsx
import { EmptyState } from '@/components/EmptyState';
import { ImageOff } from 'lucide-react';

<EmptyState
  icon={ImageOff}
  title='No items found'
  description='Get started by uploading your first item.'
  className='border-dashed border-2'
/>;
```

### File Uploads — Use `ImageUploader`

```tsx
import { ImageUploader } from '@/components/ImageUploader';

<ImageUploader
  onUploadComplete={() => {
    toast.success('Done!');
  }}
  onUploadError={(error) => {
    toast.error(`Failed: ${error.message}`);
  }}
/>;
```

### Buttons with Icons

Icons go directly inside `<Button>` — no extra wrappers or spacing classes needed.

```tsx
<Button variant='destructive'><Trash2 /> Delete</Button>
<Button><Plus /> Add New</Button>
<Button variant='ghost' size='icon'><Trash2 /></Button>
```

---

## Best Practices

### TanStack Query (React Query)

#### Queries vs Mutations

- **Queries** (`useQuery`) → reading/fetching data
- **Mutations** (`useMutation`) → any server-side action (create, update, delete, auth)

#### Query Keys

Always define query keys as constants — never inline. This makes cache invalidation reliable and refactoring safe:

```typescript
//  Centralized query keys
export const queryKeys = {
  uploads: ['uploads'] as const,
  upload: (id: string) => ['uploads', id] as const,
  bookings: ['bookings'] as const,
};

//  Usage
const { data, isLoading } = useQuery({
  queryKey: queryKeys.uploads,
  queryFn: () => fetchUploads(),
});

//  Inline keys — impossible to invalidate reliably
useQuery({ queryKey: ['uploads'], queryFn: ... });
```

#### Mutations

Always handle three things in every mutation:

1. `mutationFn` — the async action
2. `onSuccess` — redirect, toast, cache invalidation
3. `onError` — toast, form error

```typescript
const deleteMutation = useMutation({
  mutationFn: async (id: string) => {
    const result = await deleteUpload(id);
    if (result.error) throw new Error('Something went wrong.');
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.uploads });
    toast.success('Deleted successfully');
  },
  onError: (error: Error) => {
    toast.error(error.message);
  },
});
```

#### Always Throw in `mutationFn` — Never Return Errors

`onError` only fires when `mutationFn` throws. Supabase returns `{ error }` instead of throwing, so you must bridge the gap manually:

```typescript
//  onError will never fire — React Query sees this as a success
mutationFn: async () => {
  const result = await signInWithEmail(email, password);
  return result;
};

//  Throw to trigger onError
mutationFn: async () => {
  const result = await signInWithEmail(email, password);
  if (result.error) throw new Error('Invalid credentials.');
};
```

#### Loading & Success States

Use `isPending` for in-flight state. For auth/navigation mutations, also include `isSuccess` to prevent the button flashing back to idle before the page navigates away:

```tsx
//  Stays locked in loading state through navigation
<Button disabled={mutation.isPending || mutation.isSuccess}>
  {mutation.isPending || mutation.isSuccess ? (
    <><Spinner /> Signing In...</>
  ) : (
    <>Sign In <LogIn /></>
  )}
</Button>

//  Flashes back to idle briefly before navigation completes
<Button disabled={mutation.isPending}>
```

Never use the deprecated `isLoading` on mutations — use `isPending`.

#### Cache Invalidation

Always invalidate related queries after mutations that change data:

```typescript
const queryClient = useQueryClient();

onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.uploads });
};
```

#### Integration with React Hook Form

Wire `onError` to both a toast and `setError('root')` for inline form feedback:

```typescript
onError: (error: Error) => {
  form.setError('root', { message: error.message });
  toast.error('Action failed', { description: error.message });
},
```

Display root errors below your fields:

```tsx
{
  form.formState.errors.root && (
    <div className='text-sm text-destructive'>{form.formState.errors.root.message}</div>
  );
}
```

#### General Rules

- Never use `useMutation` or `useQuery` inside service files — they belong in components or hooks only
- Never use local `useState` for loading when a TanStack Query mutation or query is available
- Never call `useQueryClient()` inside service files — only in components
- Prefer `useMutation` over manual `useState` + `try/catch` for any async action in components

---

### Security & Error Handling

**Never expose to clients:**

- Supabase error messages or stack traces
- SQL details or internal IDs
- Auth state details (`"User does not exist"`, `"Incorrect password"`)
- UploadThing internal errors

**Default user-facing error:**

> "Something went wrong. Please try again."

**Safe errors allowed to show:**

- "Invalid email format."
- "Password must be at least 8 characters."
- "File type not supported."
- "File size exceeds limit."

**Auth errors always use:**

- `"Invalid credentials."` or `"Unauthorized."`

**Supabase calls:**

```typescript
const { data, error } = await supabase.from('table').select('*');
if (error) {
  console.error('[Service] Error:', error); // Log server-side only
  throw new Error('Something went wrong.'); // Generic to client
}
```

### Logging

```typescript
//  Remove verbose success logs
console.log('[API] Request received');

//  Keep error logs with context
console.error('[UploadService] Database error:', error);

//  Obvious comments
// Create a new user
const user = await createUser();

//  Explain non-obvious behavior
// Skip auth check for callbacks — they don't have user session cookies
```

### Middleware (`proxy.ts`)

UploadThing callback routes must be excluded from middleware in **both** the matcher and an early return:

```typescript
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/v1/uploadthing')) {
    return NextResponse.next();
  }
  // normal auth logic...
}

export const config = {
  matcher: [
    '/((?!_next|api/v1/uploadthing|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
};
```

### UploadThing

- Exclude `/api/v1/uploadthing` from middleware (see above)
- Let UploadThing auto-detect callback URLs — don't set `callbackUrl` manually
- Callbacks don't have session cookies — skip auth checks for them (detect by absence of `actionType` query param)
- On Vercel: add `/api/v1/uploadthing` to "Protection Bypass for Automation" in project settings, or file metadata will never be saved (silent 401 failure)

### Authentication

```typescript
import { getCurrentUser, signInWithEmail, signOut, useAuth } from '@/hooks/use-auth';

const { user, error } = await getCurrentUser();
const { user } = useAuth(); // in components
```

Protected pages: check auth in `useEffect`, redirect to `/login` if no user.
Login pages: redirect authenticated users away to `/admin`.

### General Code Rules

- Import types from `@/lib/types`
- Never call Supabase directly in React components
- Wrap all external calls in `try/catch`
- Separate logging from response logic
- Prefer explicit types and return contracts
- Service functions must return structured `{ success, data?, error? }` responses

### Logging — Use `Logger` from `@/lib/logger`

Never use `console.log`, `console.error`, `console.warn`, or `console.debug` directly. Always use the `Logger` utility — server-side only.

```typescript
import { Logger } from '@/lib/logger';

Logger.info('Fetching uploads');
Logger.warn('No data returned');
Logger.error('Database failed', error);
Logger.debug('Payload', payload);
```

- `Logger` is server-side only — never import it in components or client code
- Caller name is auto-detected — never pass a prefix like `[ServiceName]` manually
- Use `Logger.error` for caught exceptions, always pass the error object as a second arg
- Remove any existing `console.*` calls when touching a file

---

## CMS / Admin UI Patterns

### Action Placement

**Global actions** (e.g. "Add New") belong at the **top of the page**. **Item-specific actions** (edit, delete) belong **on each card** — never at the top.

```tsx
//  Correct
<div>
  <Button onClick={openAddDialog}>Add New Collection</Button>

  {collections.map(collection => (
    <Card key={collection.id}>
      {/* ... */}
      <Button onClick={() => openEditDialog(collection)}>Edit</Button>
      <Button onClick={() => confirmDelete(collection.id)}>Delete</Button>
    </Card>
  ))}
</div>

//  Wrong — item actions at the top
<div>
  <Button>Edit Collection</Button>
  <Button>Delete Collection</Button>
</div>
```

### Add / Edit Forms — Single Shared Component

When add and edit forms are identical or near-identical, use **one shared component** with a `mode` prop. Never duplicate the form. The `mode` prop controls the title, submit label, and default values. Use `mode='add'` for new records and `mode='edit'` with the existing record passed in as a prop.

```typescript
interface CollectionFormProps {
  mode: 'add' | 'edit';
  collection?: Collection;
  onSuccess?: () => void;
}

export function CollectionForm({ mode, collection, onSuccess }: CollectionFormProps) {
  const form = useForm({
    defaultValues: collection || {/* empty defaults */},
  });

  return (
    <Form>
      <DialogTitle>{mode === 'add' ? 'Add Collection' : 'Edit Collection'}</DialogTitle>
      {/* form fields */}
      <Button type='submit'>{mode === 'add' ? 'Create' : 'Update'}</Button>
    </Form>
  );
}
```

### Add / Edit — Use Dialog or Sheet

Spawn add/edit forms in a **Dialog** (simple forms) or **Sheet** (longer forms) — never navigate to a separate page unless the form is very complex.

```tsx
//  Use Dialog for simple forms
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <CollectionForm mode='add' onSuccess={() => setIsOpen(false)} />
  </DialogContent>
</Dialog>;

//  Don't navigate to separate pages for simple CRUD
router.push('/collections/new');
```

### Delete — Always Confirm

Never delete on a single click. Always wrap the delete action in a confirmation **AlertDialog**. The mutation should only fire after the user confirms.

```tsx
<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone. This will permanently delete the collection.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={() => deleteMutation.mutate(collectionId)}>
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Completion Checklist

After completing any code changes, **always** verify the following:

1. **Check for TypeScript errors** — Use `get_errors` tool or run `pnpm tsc --noEmit` to ensure no type errors
2. **Check for runtime errors** — Start the dev server and verify the changed functionality works as expected
3. **Test the user flow** — Navigate to the affected pages/components and interact with them
4. **Review imports** — Ensure all imports are valid and paths are correct
5. **Check console** — Verify no unexpected warnings or errors appear in browser or terminal

Don't mark changes as complete until these checks pass
