// Find the theme toggle button and update it:
<Button
  variant="ghost"
  size="sm"
  onClick={toggleTheme}
  className="text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
  title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
>
  {isDark ? (
    <>
      <Sun className="h-5 w-5 mr-2" />
      <span className="hidden sm:inline">Light Mode</span>
    </>
  ) : (
    <>
      <Moon className="h-5 w-5 mr-2" />
      <span className="hidden sm:inline">Dark Mode</span>
    </>
  )}
</Button>