import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      theme="light"
      position="top-center"
      richColors
      expand
      visibleToasts={3}
    />
  );
}
