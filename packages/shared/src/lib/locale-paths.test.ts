import { describe, expect, it } from "vitest";
import { catalanPathOf, localePath, routePublicPath } from "./locale-paths";

const BOTH = ["ca", "es"] as const;

describe("localePath", () => {
  it("leaves catalan paths as they are", () => {
    expect(localePath("ca", "/")).toBe("/");
    expect(localePath("ca", "/linies/20")).toBe("/linies/20");
  });

  it("prefixes spanish paths and translates the first segment", () => {
    expect(localePath("es", "/")).toBe("/es");
    expect(localePath("es", "/linies")).toBe("/es/lineas");
    expect(localePath("es", "/linies/n1")).toBe("/es/lineas/n1");
    expect(localePath("es", "/parades/10242-placa-espanya")).toBe(
      "/es/paradas/10242-placa-espanya",
    );
    expect(localePath("es", "/privadesa")).toBe("/es/privacidad");
  });

  it("keeps the query and hash", () => {
    expect(localePath("es", "/?lines=1,4&stop=10211")).toBe(
      "/es?lines=1,4&stop=10211",
    );
    expect(localePath("es", "/tarifes#t-jove")).toBe("/es/tarifas#t-jove");
  });
});

describe("routePublicPath", () => {
  it("rewrites catalan paths onto the ca segment", () => {
    expect(routePublicPath("/", BOTH)).toEqual({ rewrite: "/ca", lang: "ca" });
    expect(routePublicPath("/linies/20", BOTH)).toEqual({
      rewrite: "/ca/linies/20",
      lang: "ca",
    });
  });

  it("redirects the internal ca prefix to the public path", () => {
    expect(routePublicPath("/ca", BOTH)).toEqual({ redirect: "/" });
    expect(routePublicPath("/ca/linies/20", BOTH)).toEqual({
      redirect: "/linies/20",
    });
  });

  it("rewrites spanish paths onto the catalan route names", () => {
    expect(routePublicPath("/es", BOTH)).toEqual({
      rewrite: "/es",
      lang: "es",
    });
    expect(routePublicPath("/es/lineas/20", BOTH)).toEqual({
      rewrite: "/es/linies/20",
      lang: "es",
    });
    expect(routePublicPath("/es/no-existeix", BOTH)).toEqual({
      rewrite: "/es/no-existeix",
      lang: "es",
    });
  });

  it("redirects a spanish path written with a catalan segment", () => {
    expect(routePublicPath("/es/linies/20", BOTH)).toEqual({
      redirect: "/es/lineas/20",
    });
  });

  it("treats an unpublished language as a catalan path", () => {
    expect(routePublicPath("/es/lineas/20", ["ca"])).toEqual({
      rewrite: "/ca/es/lineas/20",
      lang: "ca",
    });
  });

  it("round-trips every catalan page through its spanish url", () => {
    for (const path of [
      "/",
      "/linies",
      "/linies/7",
      "/parades/1-x",
      "/tarifes",
    ]) {
      const route = routePublicPath(localePath("es", path), BOTH);
      expect(route).toEqual({
        rewrite: `/es${path === "/" ? "" : path}`,
        lang: "es",
      });
    }
  });
});

describe("catalanPathOf", () => {
  it("finds the catalan page behind a public path", () => {
    expect(catalanPathOf("/", BOTH)).toBe("/");
    expect(catalanPathOf("/linies/20", BOTH)).toBe("/linies/20");
    expect(catalanPathOf("/es", BOTH)).toBe("/");
    expect(catalanPathOf("/es/lineas/20", BOTH)).toBe("/linies/20");
    expect(catalanPathOf("/es/paradas/1-x", BOTH)).toBe("/parades/1-x");
  });

  it("follows the redirects a public path would take", () => {
    expect(catalanPathOf("/ca/linies", BOTH)).toBe("/linies");
    expect(catalanPathOf("/es/linies/20", BOTH)).toBe("/linies/20");
  });
});
