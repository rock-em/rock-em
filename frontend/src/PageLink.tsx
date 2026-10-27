import type { ComponentProps } from 'react';
import { navigateTo } from './navigation';

export function PageLink({ href = '/', onClick, ...props }: ComponentProps<'a'>) {
  return <a {...props} href={href} onClick={(event) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigateTo(href);
  }} />;
}
