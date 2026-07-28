import { AlertIcon, RefreshIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";

export function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-2.5">
        <AlertIcon className="mt-0.5 h-4.5 w-4.5 shrink-0 text-danger" />
        <p className="text-sm leading-snug text-danger">{message}</p>
      </div>
      <Button variant="secondary" size="sm" icon={<RefreshIcon className="h-3.5 w-3.5" />} onClick={onRetry} className="shrink-0">
        Retry
      </Button>
    </div>
  );
}
