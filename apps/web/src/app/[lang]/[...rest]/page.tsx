import { notFound } from "next/navigation";

/**
 * Every path the middleware rewrites onto a language but no route matches.
 * Without it Next would answer from outside the `[lang]` layout, which is the
 * root layout here, and there is none above it to render the 404 in.
 */
const UnknownPage = () => notFound();

export default UnknownPage;
