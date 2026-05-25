import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();
  const resourceMatch = url.pathname.match(
    /^\/organization\/([^/]+)\/resource_summary\/(.+)$/,
  );

  if (resourceMatch) {
    const [, id, childPath] = resourceMatch;
    url.pathname = `/organization/${id}/resource_summary`;

    if (childPath === "resources") {
      url.searchParams.set("view", "resources");
    } else {
      url.searchParams.set("summary_id", childPath);
    }

    return NextResponse.rewrite(url);
  }

  const schedulerMatch = url.pathname.match(
    /^\/organization\/([^/]+)\/schedular\/details\/([^/]+)$/,
  );

  if (schedulerMatch) {
    const [, id, schedulerId] = schedulerMatch;
    url.pathname = `/organization/${id}/schedular`;
    url.searchParams.set("scheduler_id", schedulerId);
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/organization/:id/resource_summary/:path*",
    "/organization/:id/schedular/details/:schId",
  ],
};
