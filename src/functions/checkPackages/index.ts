import axios from 'axios';
import { Resend } from 'resend';
import { config } from '../../config';
import { container, Project } from '../../cosmosDbClient';

interface PackageInfo {
    name: string;
    version: string;
}

interface LibrariesIoResponse {
    latest_stable_release_number: string;
}

const timerTrigger = async function (context: any, myTimer: any): Promise<void> {
    const timeStamp = new Date().toISOString();
    context.log('Timer trigger function ran!', timeStamp);

    // Get all projects from Cosmos DB
    const { resources: projects } = await container.items.readAll<Project>().fetchAll();

    for (const project of projects) {
        await checkPackagesForProject(context, project);
    }
};

async function checkPackagesForProject(context: any, project: Project): Promise<void> {
    const dependencies: PackageInfo[] = Object.entries(project.dependencies).map(([name, version]) => ({
        name,
        version: version.replace('^', '') // Remove caret to normalize the version
    }));

    const updatedPackages: PackageInfo[] = [];

    for (const pkg of dependencies) {
        try {
            const response = await axios.get<LibrariesIoResponse>(
                `https://libraries.io/api/${project.platform}/${pkg.name}?api_key=${config.librariesIoApiKey}`
            );
            const latestVersion = response.data.latest_stable_release_number;

            if (latestVersion !== pkg.version) {
                updatedPackages.push({ name: pkg.name, version: latestVersion });
            }
        } catch (error) {
            context.log.error(`Error fetching data for ${pkg.name} on ${project.platform}:`, error);
        }
    }

    if (updatedPackages.length > 0) {
        await sendEmailNotification(project, updatedPackages);
        context.log(`Email notification sent for project ${project.id}`);
    } else {
        context.log(`No package updates found for project ${project.id}`);
    }
}

async function sendEmailNotification(project: Project, updatedPackages: PackageInfo[]): Promise<void> {
    const resend = new Resend(config.resendApiKey);

    const emailContent = `
        <h1>Package Update Notification</h1>
        <p>The following packages have new versions available:</p>
        <ul>
            ${updatedPackages.map(pkg => `<li>${pkg.name}: ${pkg.version}</li>`).join('')}
        </ul>
    `;

    await resend.emails.send({
        from: 'noreply@yourdomain.com',
        to: project.contacts,
        subject: 'Package Update Notification',
        html: emailContent
    });
}

export default timerTrigger;
