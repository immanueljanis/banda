import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="docs wrap">
      <span className="section-index mono">404</span>
      <h1>This basket isn’t on the shelf.</h1>
      <p>
        <Link className="empty-link" href="/#baskets">
          Explore the collection →
        </Link>
      </p>
    </main>
  );
}
