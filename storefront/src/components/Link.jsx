export default function Link({ href, children, className, onClick, ...props }) {
  return <a href={href} className={className} onClick={(event) => {
    if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && href.startsWith('/')) {
      event.preventDefault(); window.history.pushState({}, '', href); window.dispatchEvent(new PopStateEvent('popstate'));
    }
    onClick?.(event);
  }} {...props}>{children}</a>;
}
