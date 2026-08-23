function Text ({ children, className }) {
  return (
    <p className={`text-3xl font-bold underline ${className}`}>
      {children}
    </p>
  )
}
export default Text