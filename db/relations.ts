import { relations } from "drizzle-orm";
import { documents, packageVersions, projects, runs } from "./schema";

/**
 * Drizzle relation declarations.
 *
 * These are query-helper metadata (no DDL) that let `db.query.*` relational
 * queries traverse associations. They mirror the foreign keys already
 * declared in db/schema.ts (SQLite dev) / db/schema.pg.ts (PostgreSQL prod).
 *
 * We import from "./schema" (SQLite) because the app's unified `Db` type is
 * built on the SQLite schema (see api/queries/connection.ts). The PG schema
 * is structurally identical, so the relation shape is the same.
 */

// A project has many package versions, documents, and run metrics.
export const projectsRelations = relations(projects, ({ many }) => ({
    packageVersions: many(packageVersions),
    documents: many(documents),
    runs: many(runs),
}));

// A package version belongs to one project and has many documents.
export const packageVersionsRelations = relations(packageVersions, ({ one, many }) => ({
    project: one(projects, {
        fields: [packageVersions.projectId],
        references: [projects.id],
    }),
    documents: many(documents),
}));

// A document belongs to one project, one package version, and (for bundle
// sections) one parent document. A parent bundle document has many sections.
export const documentsRelations = relations(documents, ({ one, many }) => ({
    project: one(projects, {
        fields: [documents.projectId],
        references: [projects.id],
    }),
    packageVersion: one(packageVersions, {
        fields: [documents.packageVersionId],
        references: [packageVersions.id],
    }),
    // Self-reference: parent bundle document -> its section rows.
    parentDocument: one(documents, {
        fields: [documents.parentDocumentId],
        references: [documents.id],
        relationName: "documentSections",
    }),
    sections: many(documents, { relationName: "documentSections" }),
}));

// A run belongs to one project.
export const runsRelations = relations(runs, ({ one }) => ({
    project: one(projects, {
        fields: [runs.projectId],
        references: [projects.id],
    }),
}));
