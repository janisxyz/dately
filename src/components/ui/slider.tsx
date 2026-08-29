import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

export function Slider({
  className,
  ...props
}: SliderPrimitive.SliderProps) {
  return (
    <SliderPrimitive.Root
      className={cn("relative flex h-11 w-full touch-none items-center", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-fg/12">
        <SliderPrimitive.Range className="absolute h-full bg-rose" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block size-5 rounded-full bg-accent shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/40" />
    </SliderPrimitive.Root>
  );
}
