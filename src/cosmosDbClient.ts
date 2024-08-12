// cosmosDbClient.ts
import { CosmosClient } from "@azure/cosmos";
import { config } from "./config";

const client = new CosmosClient({
  endpoint: config.cosmosDb.endpoint,
  key: config.cosmosDb.key
});

const database = client.database(config.cosmosDb.databaseId);
const container = database.container(config.cosmosDb.containerId);

export interface Project {
  id: string;
  apiKey: string;
  contacts: string[];
  platform: string;
  dependencies: Record<string, string>;
}

export async function getProjectByApiKey(apiKey: string): Promise<Project | undefined> {
  const querySpec = {
    query: "SELECT * FROM c WHERE c.apiKey = @apiKey",
    parameters: [{ name: "@apiKey", value: apiKey }]
  };

  const { resources } = await container.items.query(querySpec).fetchAll();
  return resources[0] as Project | undefined;
}

export { container };