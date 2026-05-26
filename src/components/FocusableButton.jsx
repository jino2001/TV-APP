export default function FocusableButton({
  children,
  className = "",
  variant = "primary",
  ...props
}) {
  return (
    <button
      type="button"
      data-tv-focusable="true"
      className={`focusable-button focusable-button--${variant} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
