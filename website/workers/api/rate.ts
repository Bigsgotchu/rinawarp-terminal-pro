/**
 * RinaWarp Marketplace API - Rate Handler
 */

export async function rateAgent(req: Request, env: any): Promise<Response> {
  try {
    const body = await req.json() as { agent: string; rating: number; userId?: string };
    
    if (!body.agent || !body.rating || body.rating < 1 || body.rating > 5) {
      return new Response(JSON.stringify({ error: "invalid: agent and rating (1-5) required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Store rating (in production, use RATINGS_KV)
    const ratings = env.RATINGS || [];
    ratings.push({ agent: body.agent, rating: body.rating, userId: body.userId });
    
    // Calculate average
    const agentRatings = ratings.filter((r: any) => r.agent === body.agent);
    const avg = agentRatings.reduce((sum: number, r: any) => sum + r.rating, 0) / agentRatings.length;
    
    return new Response(JSON.stringify({ 
      success: true, 
      averageRating: avg.toFixed(1),
      totalRatings: agentRatings.length
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
}
