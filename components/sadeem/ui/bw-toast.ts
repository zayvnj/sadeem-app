import { toast } from 'sonner'

export const bwToast = {
  success: (msg: string) =>
    toast.success(msg, {
      style: { background: '#0A0A0A', color: '#FFFFFF', border: '1px solid #2A2A2A' },
    }),
  error: (msg: string, onRetry?: () => void) =>
    toast.error(msg, {
      style: { background: '#0A0A0A', color: '#FFFFFF', border: '1px solid #2A2A2A' },
      action: onRetry ? { label: 'إعادة', onClick: onRetry } : undefined,
    }),
  loading: (msg: string) =>
    toast.loading(msg, {
      style: { background: '#0A0A0A', color: '#FFFFFF', border: '1px solid #2A2A2A' },
    }),
  dismiss: (id?: string | number) => toast.dismiss(id)
}
