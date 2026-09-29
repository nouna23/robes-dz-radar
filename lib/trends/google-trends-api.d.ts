// google-trends-api n'a pas de types officiels — déclaration minimale
// couvrant uniquement ce que ce projet utilise.
declare module "google-trends-api" {
  interface InterestOverTimeOptions {
    keyword: string;
    startTime?: Date;
    geo?: string;
  }

  const googleTrends: {
    interestOverTime(options: InterestOverTimeOptions): Promise<string>;
  };
  export default googleTrends;
}
