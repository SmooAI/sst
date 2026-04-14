import {
  ComponentResourceOptions,
  Output,
  output,
} from "@pulumi/pulumi";
import { Component } from "../component";
import { apigatewayv2, lambda } from "@pulumi/aws";
import {
  ApiGatewayV2BaseRouteArgs,
  createApiRoute,
} from "./apigatewayv2-base-route";
import { Function } from "./function";

export interface Args extends ApiGatewayV2BaseRouteArgs {
  /**
   * The pre-existing integration to attach this route to.
   *
   * Created by an earlier `api.route(...)` call against the same handler when
   * `dedupeHandlers` is enabled on the parent `ApiGatewayV2`.
   */
  integration: apigatewayv2.Integration;
  /**
   * The pre-existing Lambda function backing the shared integration.
   *
   * Surfaced through `nodes.function` so consumers can resolve the underlying
   * handler the same way they would on a non-shared route.
   */
  lambdaFunction: Output<Function>;
  /**
   * The pre-existing Lambda invoke permission backing the shared integration.
   */
  permission: lambda.Permission;
}

/**
 * The `ApiGatewayV2LambdaSharedRoute` component is internally used by the
 * `ApiGatewayV2` component to add a route that targets an existing
 * `apigatewayv2.Integration` (and its Lambda function + permission), instead
 * of creating new ones. This is what powers `dedupeHandlers: true`.
 *
 * AWS HTTP APIs cap Integrations at 300 per API (a hard cap that is *not*
 * adjustable through Service Quotas), so two `api.route()` calls pointing at
 * the same handler would otherwise burn two of those 300 slots. With
 * `dedupeHandlers` enabled, the second call lands here and reuses the first
 * route's integration.
 *
 * :::note
 * This component is not intended to be created directly.
 * :::
 */
export class ApiGatewayV2LambdaSharedRoute extends Component {
  private readonly lambdaFunction: Output<Function>;
  private readonly permission: lambda.Permission;
  private readonly apiRoute: Output<apigatewayv2.Route>;
  private readonly integration: apigatewayv2.Integration;

  constructor(name: string, args: Args, opts?: ComponentResourceOptions) {
    super(__pulumiType, name, args, opts);

    this.lambdaFunction = args.lambdaFunction;
    this.permission = args.permission;
    this.integration = args.integration;
    this.apiRoute = createApiRoute(name, args, output(args.integration.id), this);
  }

  /**
   * The underlying [resources](/docs/components/#nodes) this component creates.
   */
  public get nodes() {
    return {
      /**
       * The Lambda function (shared with the route that originally created it).
       */
      function: this.lambdaFunction,
      /**
       * The Lambda permission (shared with the route that originally created it).
       */
      permission: this.permission,
      /**
       * The API Gateway HTTP API route (unique to this path).
       */
      route: this.apiRoute,
      /**
       * The API Gateway HTTP API integration (shared with the route that
       * originally created it).
       */
      integration: this.integration,
    };
  }
}

const __pulumiType = "sst:aws:ApiGatewayV2LambdaSharedRoute";
// @ts-expect-error
ApiGatewayV2LambdaSharedRoute.__pulumiType = __pulumiType;
