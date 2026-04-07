import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Step {
  label: string;
}

interface FormWizardProps {
  steps: Step[];
  currentStep: number; // 0-based
  className?: string;
}

/**
 * Barra de progreso de secciones para formularios multi-paso.
 * currentStep: índice 0-based del paso activo.
 */
export function FormWizard({ steps, currentStep, className }: FormWizardProps) {
  return (
    <div className={cn("w-full", className)}>
      {/* Barra de progreso */}
      <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-1 bg-reca transition-all duration-500 ease-out"
          style={{
            width: `${((currentStep + 1) / steps.length) * 100}%`,
          }}
        />
      </div>

      {/* Pasos */}
      <div className="mt-4 flex items-start justify-between gap-2">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;

          return (
            <div
              key={index}
              className="flex flex-1 flex-col items-center gap-1.5"
            >
              {/* Círculo */}
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
                  isCompleted &&
                    "bg-reca border-reca text-white",
                  isActive &&
                    "bg-white border-reca text-reca",
                  !isCompleted &&
                    !isActive &&
                    "bg-white border-gray-300 text-gray-400"
                )}
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-center text-[10px] leading-tight hidden sm:block",
                  isActive ? "text-reca font-semibold" : "text-gray-400"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
