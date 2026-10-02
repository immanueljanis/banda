import data from "@/lib/data/market-history.json";
export function GET() {
  return Response.json(data, {
    headers: {
      "Content-Disposition": 'attachment; filename="banda-market-history.json"',
    },
  });
}
