# Loading System Documentation

Sistem loading yang telah diperbaiki untuk memberikan pengalaman pengguna yang lebih baik saat halaman dimuat.

## Komponen Loading

### 1. PageLoader
Komponen loading utama untuk halaman penuh dengan animasi yang menarik.

```tsx
import { PageLoader } from "@/components/ui/loading";

<PageLoader message="Memuat halaman..." />
```

### 2. ContentLoader
Komponen loading untuk konten spesifik dengan pesan kustom.

```tsx
import { ContentLoader } from "@/components/ui/loading";

<ContentLoader message="Memuat data..." />
```

### 3. Spinner
Komponen spinner sederhana dengan berbagai ukuran.

```tsx
import { Spinner } from "@/components/ui/loading";

<Spinner size="sm" /> // sm, default, lg
```

### 4. Skeleton Components
Komponen skeleton untuk berbagai jenis konten:

#### CardSkeleton
```tsx
import { CardSkeleton } from "@/components/ui/loading";

<CardSkeleton />
```

#### TableSkeleton
```tsx
import { TableSkeleton } from "@/components/ui/loading";

<TableSkeleton rows={5} columns={6} />
```

#### ChartSkeleton
```tsx
import { ChartSkeleton } from "@/components/ui/loading";

<ChartSkeleton />
```

#### DashboardSkeleton
```tsx
import { DashboardSkeleton } from "@/components/ui/loading";

<DashboardSkeleton />
```

### 5. LoadingOverlay
Overlay loading untuk modal atau dialog.

```tsx
import { LoadingOverlay } from "@/components/ui/loading";

<LoadingOverlay message="Memproses..." />
```

### 6. ButtonLoader
Komponen untuk tombol dengan state loading.

```tsx
import { ButtonLoader } from "@/components/ui/loading";

<ButtonLoader loading={isLoading} icon={Plus}>
  Tambah Data
</ButtonLoader>
```

## Hooks

### 1. useLoading
Hook untuk mengelola loading state global.

```tsx
import { useLoading } from "@/hooks/useLoading";

const { isLoading, loadingMessage, startLoading, stopLoading } = useLoading();

// Mulai loading
startLoading("Memuat data...");

// Hentikan loading
stopLoading();
```

### 2. useAsyncLoading
Hook untuk mengelola async operations dengan loading state.

```tsx
import { useAsyncLoading } from "@/hooks/useAsyncLoading";

const { loading, error, execute } = useAsyncLoading({
  showGlobalLoader: true,
  loadingMessage: "Memuat data...",
  onError: (error) => console.error(error)
});

const handleLoadData = async () => {
  const result = await execute(async () => {
    // Async operation
    return await fetchData();
  });
};
```

### 3. useMultiLoading
Hook untuk mengelola multiple loading states.

```tsx
import { useMultiLoading } from "@/hooks/useAsyncLoading";

const { setLoading, isLoading, isAnyLoading } = useMultiLoading();

setLoading("fetchData", true);
const isDataLoading = isLoading("fetchData");
```

### 4. useLoadingSteps
Hook untuk mengelola loading dengan steps/progress.

```tsx
import { useLoadingSteps, LoadingProgress } from "@/components/ui/loading-progress";

const { steps, startStep, completeStep, errorStep } = useLoadingSteps([
  { id: "step1", label: "Memuat data" },
  { id: "step2", label: "Memproses data" },
  { id: "step3", label: "Menyimpan data" }
]);

// Gunakan dalam component
<LoadingProgress steps={steps} />
```

## Komponen Global

### 1. GlobalLoader
Loader global yang muncul di bagian atas halaman.

```tsx
import { GlobalLoader } from "@/components/ui/global-loader";

// Sudah terintegrasi di App.tsx
```

### 2. RouteLoader
Loader untuk transisi antar halaman.

```tsx
import { RouteLoader } from "@/components/ui/route-loader";

// Sudah terintegrasi di App.tsx
```

## Animasi CSS

Sistem ini menggunakan animasi CSS kustom:

- `animate-loading-bar`: Animasi loading bar
- `animate-pulse-glow`: Animasi pulse dengan glow effect
- `animate-slide-in-up`: Animasi slide dari bawah
- `animate-fade-in`: Animasi fade in
- `animate-scale-in`: Animasi scale in
- `animate-shimmer`: Animasi shimmer untuk skeleton

## Contoh Penggunaan

### Halaman dengan Loading State
```tsx
import { DashboardSkeleton } from "@/components/ui/loading";

const Dashboard = () => {
  const [loading, setLoading] = useState(true);

  if (loading) {
    return (
      <AppLayout title="Dashboard">
        <DashboardSkeleton />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard">
      {/* Content */}
    </AppLayout>
  );
};
```

### Komponen dengan Async Loading
```tsx
import { useAsyncLoading } from "@/hooks/useAsyncLoading";
import { TableSkeleton } from "@/components/ui/loading";

const Products = () => {
  const { loading, execute } = useAsyncLoading({
    showGlobalLoader: false
  });

  const loadProducts = async () => {
    await execute(async () => {
      // Load products
    });
  };

  return (
    <div>
      {loading ? (
        <TableSkeleton rows={8} columns={6} />
      ) : (
        // Table content
      )}
    </div>
  );
};
```

### Button dengan Loading State
```tsx
import { ButtonLoader } from "@/components/ui/loading";
import { useAsyncLoading } from "@/hooks/useAsyncLoading";

const SubmitButton = () => {
  const { loading, execute } = useAsyncLoading();

  const handleSubmit = async () => {
    await execute(async () => {
      // Submit logic
    });
  };

  return (
    <Button onClick={handleSubmit} disabled={loading}>
      <ButtonLoader loading={loading} icon={Save}>
        Simpan Data
      </ButtonLoader>
    </Button>
  );
};
```

## Fitur Utama

1. **Loading States yang Konsisten**: Semua komponen menggunakan design system yang sama
2. **Animasi yang Smooth**: Transisi dan animasi yang halus untuk UX yang lebih baik
3. **Skeleton Loading**: Placeholder yang realistis untuk konten yang sedang dimuat
4. **Global Loading**: Indikator loading global untuk operasi yang mempengaruhi seluruh aplikasi
5. **Route-based Loading**: Loading state saat navigasi antar halaman
6. **Progress Tracking**: Kemampuan untuk melacak progress loading dengan steps
7. **Error Handling**: Integrasi dengan error handling untuk loading yang gagal
8. **Responsive Design**: Semua komponen loading responsive untuk berbagai ukuran layar

## Best Practices

1. **Gunakan Skeleton**: Untuk konten yang membutuhkan waktu lama, gunakan skeleton loading
2. **Pesan yang Informatif**: Berikan pesan loading yang jelas dan informatif
3. **Minimum Loading Time**: Berikan minimum loading time untuk menghindari flicker
4. **Error States**: Selalu handle error states dalam loading
5. **Accessibility**: Pastikan loading states accessible untuk screen readers
6. **Performance**: Gunakan lazy loading untuk komponen yang tidak critical 