import DeploymentDetailsClient from "./DeploymentClient";

export default async function DeploymentDetailsPage({
   params,
}: {
   params: Promise<{ projectId: string; deploymentId: string }>;
}) {
   const { projectId, deploymentId } = await params;

   return (
      <DeploymentDetailsClient
         projectId={projectId}
         deploymentId={deploymentId}
      />
   );
}
