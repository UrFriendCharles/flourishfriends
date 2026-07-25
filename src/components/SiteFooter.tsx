/**
 * Site attribution footer. "UrFriendCharles" links to the main site;
 * "Flourish House LLC" is plain text.
 */
export function SiteFooter() {
  return (
    <footer className="mt-8 pb-2 text-center text-xs text-slate-500">
      <p>
        Powered by{" "}
        <a
          href="https://urfriendcharles.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-sky-400 underline-offset-4 transition hover:text-sky-300 hover:underline"
        >
          UrFriendCharles
        </a>{" "}
        and Flourish House LLC
      </p>
    </footer>
  );
}
