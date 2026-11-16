import { useEffect, useRef, type PointerEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import type { ShaderMount } from "@paper-design/shaders";
import { Link } from "../../lib/Link";
import "./LiquidMetalButton.css";

const motionQuery = "(prefers-reduced-motion: reduce)";

const metalUniforms = {
  u_colorBack: [0, 0, 0, 0],
  u_colorTint: [0.84, 0.88, 1, 1],
  u_repetition: 2.25,
  u_shiftRed: 0.02,
  u_shiftBlue: 0.06,
  u_contour: 0.55,
  u_softness: 0.32,
  u_distortion: 0.36,
  u_angle: 24,
  u_shape: 0,
  u_isImage: false,
  u_fit: 2,
  u_scale: 1,
  u_rotation: 0,
  u_originX: 0.5,
  u_originY: 0.5,
  u_offsetX: 0,
  u_offsetY: 0,
  u_worldWidth: 0,
  u_worldHeight: 0,
};
type LiquidMetalButtonProps =
  | { label: string; href: string; type?: never; disabled?: never }
  | { label: string; href?: never; type: "submit"; disabled?: boolean };

export function LiquidMetalButton(props: LiquidMetalButtonProps) {
  const layerRef = useRef<HTMLSpanElement>(null);
  const shaderRef = useRef<ShaderMount | null>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || !window.WebGL2RenderingContext) return;

    const motion = window.matchMedia(motionQuery);
    let cancelled = false;
    const syncMotion = () => shaderRef.current?.setSpeed(motion.matches ? 0 : 0.45);

    async function mountShader() {
      try {
        const { liquidMetalFragmentShader, ShaderMount } = await import("@paper-design/shaders");
        if (cancelled || !layer) return;

        shaderRef.current = new ShaderMount(
          layer,
          liquidMetalFragmentShader,
          metalUniforms,
          undefined,
          0,
          900,
          1,
        );
        syncMotion();
      } catch {
        if (!cancelled) layer?.replaceChildren();
      }
    }

    void mountShader();
    motion.addEventListener("change", syncMotion);

    return () => {
      cancelled = true;
      motion.removeEventListener("change", syncMotion);
      shaderRef.current?.dispose();
      shaderRef.current = null;
    };
  }, []);

  function setSpeed(speed: number) {
    if (shaderRef.current) {
      shaderRef.current.setSpeed(window.matchMedia(motionQuery).matches ? 0 : speed);
    }
  }

  const interaction = {
    className: "liquid-metal-button",
    onPointerEnter: () => setSpeed(0.85),
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const button = event.currentTarget;
      const bounds = button.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;

      button.style.setProperty("--highlight-x", `${((event.clientX - bounds.left) / bounds.width) * 100}%`);
      button.style.setProperty("--highlight-y", `${((event.clientY - bounds.top) / bounds.height) * 100}%`);
    },
    onPointerLeave: (event: PointerEvent<HTMLElement>) => {
      event.currentTarget.style.removeProperty("--highlight-x");
      event.currentTarget.style.removeProperty("--highlight-y");
      setSpeed(0.45);
    },
  };

  const content = (
    <>
      <span className="liquid-metal-layer" ref={layerRef} aria-hidden="true" />
      <span className="liquid-metal-face">
        <span className="liquid-metal-icon" aria-hidden="true">
          <ArrowUpRight size={18} />
        </span>
        {props.label}
      </span>
    </>
  );

  if (props.href !== undefined) {
    return (
      <Link href={props.href} {...interaction}>
        {content}
      </Link>
    );
  }

  return (
    <button type={props.type} disabled={props.disabled} {...interaction}>
      {content}
    </button>
  );
}