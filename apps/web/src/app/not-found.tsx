import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mesh mesh-fade mx-auto flex min-h-[60vh] max-w-[1280px] flex-col items-center justify-center px-5 text-center">
      <p className="text-[15px] font-semibold text-brand-600">404</p>
      <h1 className="display mt-3 text-4xl">That page isn’t here.</h1>
      <p className="mt-4 text-steel-600">It may have moved, or the link was mistyped.</p>
      <Link href="/" className="mt-8 inline-flex h-11 items-center rounded-[10px] bg-ink px-5 text-sm font-semibold text-white hover:bg-steel-800">
        Back to the homepage
      </Link>
    </div>
  );
}
