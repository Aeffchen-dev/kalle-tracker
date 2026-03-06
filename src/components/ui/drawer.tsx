import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Bottom-sheet variant system
 * ─────────────────────────────
 * compact  – auto-height, no snap points  (e.g. event entry, weather)
 * medium   – snaps to 95 %, scrollable    (e.g. settings)
 * full     – persistent, multi-snap       (e.g. calendar)
 *
 * Every variant shares:
 *  • rounded-t-[24px], bg-black, border-0
 *  • safe-area bottom padding handled via CSS (index.css)
 *  • max-width constraint on large screens
 */

/* ── Variant presets ─────────────────────────────────────── */

export type DrawerVariant = "compact" | "medium" | "full";

export const DRAWER_SNAP_POINTS: Record<DrawerVariant, number[] | undefined> = {
  compact: undefined,           // auto-height, no snap points
  medium: [0.95],               // single 95 % snap
  full: undefined,              // caller provides custom snap points
};

const drawerContentVariants = cva(
  // shared base – safe-area bottom padding for PWA, shadow-fill prevents background bleed when dragging
  "fixed inset-x-0 bottom-0 z-50 flex h-auto flex-col rounded-t-[20px] border-0 bg-black shadow-none outline-none focus:outline-none focus-visible:outline-none lg:max-w-[80vw] lg:mx-auto pb-[env(safe-area-inset-bottom,0px)] after:content-[''] after:absolute after:left-0 after:right-0 after:top-full after:h-[100px] after:bg-black after:shadow-none",
  {
    variants: {
      variant: {
        compact: "overflow-hidden",
        medium: "flex flex-col max-h-[95dvh]",
        full: "flex flex-col h-full",
      },
    },
    defaultVariants: {
      variant: "compact",
    },
  },
);

/* ── Root wrapper ────────────────────────────────────────── */

type DrawerRootProps = React.ComponentProps<typeof DrawerPrimitive.Root>;

type DrawerProps = DrawerRootProps & {
  /** Pre-configured bottom-sheet size. Defaults to "compact". */
  variant?: DrawerVariant;
};

const Drawer = ({ shouldScaleBackground = false, variant = "compact", snapPoints: callerSnaps, ...props }: DrawerProps) => {
  const snapPoints = callerSnaps ?? DRAWER_SNAP_POINTS[variant];
  return (
    <DrawerPrimitive.Root
      shouldScaleBackground={shouldScaleBackground}
      snapPoints={snapPoints}
      {...props}
    />
  );
};
Drawer.displayName = "Drawer";

const DrawerTrigger = DrawerPrimitive.Trigger;

const DrawerPortal = DrawerPrimitive.Portal;

const DrawerClose = DrawerPrimitive.Close;

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay ref={ref} className={cn("fixed inset-0 z-50 bg-transparent", className)} {...props} />
));
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

/* ── Content ─────────────────────────────────────────────── */

interface DrawerContentProps
  extends React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>,
    VariantProps<typeof drawerContentVariants> {}

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  DrawerContentProps
>(({ className, children, variant, style, ...props }, ref) => {
  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        ref={ref}
        className={cn(drawerContentVariants({ variant }), className)}
        style={{ boxShadow: 'none', ...style }}
        {...props}
      >
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
});
DrawerContent.displayName = "DrawerContent";

/* ── Sub-components (unchanged API) ──────────────────────── */

const DrawerHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("grid gap-1.5 px-4 pt-4 pb-4 text-center sm:text-left", className)} {...props} />
);
DrawerHeader.displayName = "DrawerHeader";

const DrawerFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-auto flex flex-col gap-2 p-4", className)} {...props} />
);
DrawerFooter.displayName = "DrawerFooter";

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn("text-base font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DrawerDescription.displayName = DrawerPrimitive.Description.displayName;

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
  drawerContentVariants,
};
