const request = require("supertest");
const app = require("../app");

describe("SillyLillies basic routes", () => {
  it("responds with 200 on GET /", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.text).toContain("<html");
  });

  it("redirects unauthenticated /shop to /", async () => {
    const response = await request(app).get("/shop");
    expect([302, 301]).toContain(response.status);
    expect(response.headers.location).toBe("/");
  });
});
