namespace HopeAi;

// Halaman dokumentasi API: Swagger UI yang membaca /openapi/v1.json
public static class ApiDocs
{
    public const string Page = """
<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dokumentasi API HopeAI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({ url: "/openapi/v1.json", dom_id: "#swagger-ui", persistAuthorization: true });
  </script>
</body>
</html>
""";
}
