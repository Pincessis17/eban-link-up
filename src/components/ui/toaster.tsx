import { CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";

/** Confirmation popups: a green tick when something worked, a red mark when it didn't. Each plays a soft sound. */
export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const bad = props.variant === "destructive";
        const Icon = bad ? AlertCircle : CheckCircle2;
        return (
          <Toast key={id} {...props}>
            <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${bad ? "bg-kente/10" : "bg-forest/10"}`}>
              <Icon className={`h-[18px] w-[18px] ${bad ? "text-kente" : "text-forest"}`} />
            </span>
            <div className="grid flex-1 gap-0.5">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
