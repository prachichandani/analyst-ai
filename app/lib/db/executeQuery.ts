import { db } from "@/app/lib/postgres/postgres";

export async function executeQuery(sql: string) {
  if (!sql || typeof sql !== "string") {
    throw new Error("SQL query is required");
  }

  const forbiddenKeywords = [
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "ALTER",
    "TRUNCATE",
    "CREATE",
    "GRANT",
    "REVOKE",
    "COMMENT",
    "COPY",
  ];

  const upperSql = sql.toUpperCase();

  for (const keyword of forbiddenKeywords) {
    if (upperSql.includes(keyword)) {
      throw new Error(
        `Write operation "${keyword}" is not allowed.`
      );
    }
  }

  console.log("================================");
  console.log("AI Generated SQL");
  console.log(sql);
  console.log("================================");

  console.log("========== SQL ==========");
  console.log(sql);

  const result = await db.unsafe(sql);

  console.log("========== RESULT ==========");
  console.log(result);

  return result;
}