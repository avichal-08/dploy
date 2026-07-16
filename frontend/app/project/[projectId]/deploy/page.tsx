import ProjectDeploymentClient from "./DeploymentClient";

export default async function ProjectDeploymentPage({
   params,
}: {
   params: Promise<{ projectId: string }>;
}) {
   const { projectId } = await params;

   return <ProjectDeploymentClient projectId={projectId} />;
}
