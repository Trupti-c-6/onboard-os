import { describe, it, expect } from "vitest";
import {
  checkAllRequiredStepsComplete,
  checkAllRequiredStepsApproved,
} from "@/lib/portal/shared";
import { createMockSupabase } from "./mock-supabase";
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only fake client, not the real SupabaseClient type
type AnySupabase = any;

describe("checkAllRequiredStepsComplete", () => {
  it("returns true when every required step has a matching submitted row", async () => {
    const supabase = createMockSupabase({
      template_steps: [{ id: "step-1" }, { id: "step-2" }],
      client_submissions: [{ step_id: "step-1" }, { step_id: "step-2" }],
    });

    const result = await checkAllRequiredStepsComplete(
      supabase as AnySupabase,
      "instance-1",
      "template-1"
    );

    expect(result).toBe(true);
  });

  it("returns false when a required step has no submitted row", async () => {
    const supabase = createMockSupabase({
      template_steps: [{ id: "step-1" }, { id: "step-2" }],
      client_submissions: [{ step_id: "step-1" }], // step-2 missing
    });

    const result = await checkAllRequiredStepsComplete(
      supabase as AnySupabase,
      "instance-1",
      "template-1"
    );

    expect(result).toBe(false);
  });

  it("returns true (vacuously) when the template has no required steps", async () => {
    const supabase = createMockSupabase({
      template_steps: [],
      client_submissions: [],
    });

    const result = await checkAllRequiredStepsComplete(
      supabase as AnySupabase,
      "instance-1",
      "template-1"
    );

    expect(result).toBe(true);
  });

  it("is not fooled by extra submitted rows for steps that aren't required", async () => {
    const supabase = createMockSupabase({
      template_steps: [{ id: "step-1" }],
      client_submissions: [{ step_id: "step-1" }, { step_id: "some-optional-step" }],
    });

    const result = await checkAllRequiredStepsComplete(
      supabase as AnySupabase,
      "instance-1",
      "template-1"
    );

    expect(result).toBe(true);
  });
});

describe("checkAllRequiredStepsApproved", () => {
  it("returns false when steps are submitted but not yet approved", async () => {
    // Regression test for the bug found in the initial audit: an instance
    // could sit fully "submitted" forever because nothing ever checked
    // approval status to advance it to "completed".
    const supabase = createMockSupabase({
      template_steps: [{ id: "step-1" }, { id: "step-2" }],
      client_submissions: [], // nothing in this mock table is "approved" yet
    });

    const result = await checkAllRequiredStepsApproved(
      supabase as AnySupabase,
      "instance-1",
      "template-1"
    );

    expect(result).toBe(false);
  });

  it("returns true once every required step is approved", async () => {
    const supabase = createMockSupabase({
      template_steps: [{ id: "step-1" }, { id: "step-2" }],
      client_submissions: [{ step_id: "step-1" }, { step_id: "step-2" }],
    });

    const result = await checkAllRequiredStepsApproved(
      supabase as AnySupabase,
      "instance-1",
      "template-1"
    );

    expect(result).toBe(true);
  });
});
