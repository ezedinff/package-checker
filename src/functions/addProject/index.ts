import { HttpRequest } from "@azure/functions"
import { container, Project } from '../../cosmosDbClient';
import { v4 as uuidv4 } from 'uuid';

interface ProjectRequest {
    contacts: string[];
    platform: string; // NPM, Maven, NuGet, etc.
    fileContent: string;
}

const parseRequestBody = async (req: HttpRequest): Promise<ProjectRequest> => {

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
        const formData = await req.formData();
        let file = formData.get('file') as unknown as File;

        if (!file) {
            throw new Error("File not found in the request body");
        }

        const fileContent = await file.text();
        const platform = formData.get('platform') as string;
        const contacts = (formData.get('contacts') as string).split(',');

        return { contacts, platform, fileContent };
    }

    throw new Error("Unsupported content type");
};

const extractDependenciesFromPackageJson = (packageJson: string): Record<string, string> => {
    const parsedJson = JSON.parse(packageJson);
    return {...(parsedJson.dependencies ? parsedJson.dependencies : {}), ...(parsedJson.devDependencies ? parsedJson.devDependencies : {})};
};

const httpTrigger = async function (context: any, req: HttpRequest): Promise<void> {
    const { contacts, platform, fileContent } = await parseRequestBody(req);

    if (!contacts || !platform || !Array.isArray(contacts)) {
        context.res = {
            status: 400,
            body: "Please provide contacts and platforms as arrays in the request body"
        };
        return;
    }

    const newProject: Project = {
        id: uuidv4(),
        apiKey: uuidv4(),
        contacts,
        platform,
        dependencies: {},
    };

    if (platform.toLowerCase() === 'npm' && fileContent) {
        newProject.dependencies = extractDependenciesFromPackageJson(fileContent);
    }

    await container.items.create(newProject);

    context.res = {
        status: 200,
        body: {
            message: "Project added successfully. Please make a note of your API key because you won't be able to see it again.",
            apiKey: newProject.apiKey
        }
    };
};

export default httpTrigger;