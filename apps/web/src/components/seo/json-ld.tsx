/**
 * A schema.org block for search engines.
 *
 * `<` is escaped because the payload is written into a `<script>` element as raw
 * text: a stop or line name containing `</script>` would otherwise end the
 * element early and spill the rest of the JSON into the page as markup.
 */
export const JsonLd = ({ data }: { data: Record<string, unknown> }) => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: JSON.stringify(data).replace(/</g, "\\u003c"),
    }}
  />
);
