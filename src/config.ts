export const config = {
    cosmosDb: {
        endpoint: process.env.COSMOS_DB_ENDPOINT || "",
        key: process.env.COSMOS_DB_KEY || "",
        databaseId: "ProjectsDB",
        containerId: "Projects"
    },
    librariesIoApiKey: process.env.LIBRARIES_IO_API_KEY || "",
    resendApiKey: process.env.RESEND_API_KEY || ""
};