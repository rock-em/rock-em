import type { ComponentProps } from "react";
import { isPlainClick, navigate } from "./router";

export function Link({ href = "/", onClick, ...props }: ComponentProps<"a">) {
  return (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || !isPlainClick(event)) return;
        event.preventDefault();
        navigate(href);
      }}
    />
  );
}
