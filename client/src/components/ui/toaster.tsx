import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      theme="light"
      position="top-center"
      richColors
      expand
      visibleToasts={3}
      offset="60px"
      toastOptions={{
        style: {
          zIndex: 9999,
        },
        className: 'mt-safe-top',
      }}
    />
  );
}
