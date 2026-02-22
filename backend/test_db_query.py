import os
from databricks import sql
from dotenv import load_dotenv

load_dotenv()

print("HOST:", os.environ.get("DATABRICKS_HOST"))
print("WAREHOUSE:", os.environ.get("DATABRICKS_WAREHOUSE_ID"))
print("TOKEN present:", bool(os.environ.get("DATABRICKS_TOKEN")))

# databricks-sql-connector expects server_hostname and http_path and access_token
conn = sql.connect(
    server_hostname=os.environ['DATABRICKS_HOST'],
    http_path=f"/sql/1.0/warehouses/{os.environ['DATABRICKS_WAREHOUSE_ID']}",
    access_token=os.environ['DATABRICKS_TOKEN']
)
cur = conn.cursor()
cur.execute("SELECT category, total_sum FROM workspace.master_data.model_ml_updated2 WHERE UPPER(TRIM(country)) = 'ALGERIA' AND year = 2025")
rows = cur.fetchall()
print('rows:', rows)
cur.close()
conn.close()