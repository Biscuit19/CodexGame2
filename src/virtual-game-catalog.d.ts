declare module "virtual:game-tuning-catalog" {
  const catalog: unknown;
  export default catalog;
}

declare module "virtual:game-release" {
  const release: { fingerprint: string; builtAt: string };
  export default release;
}
