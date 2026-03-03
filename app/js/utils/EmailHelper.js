/**
 * EmailHelper - Config-driven email templates and CSV downloads.
 */

class EmailHelper {
    constructor(config) {
        this.config = config;
        this.email = config.project.contactEmail || '';
        this.title = config.project.title || 'WebGIS';
    }

    downloadCSVTemplate() {
        const columns = this.config.database.columns
            .filter(c => c.name !== 'id' && c.name !== 'created_at' && c.name !== 'updated_at')
            .map(c => c.name);
        const header = columns.join(',');
        const blob = new Blob([header + '\n'], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.config.database.tableName}_template.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    openSubmitDataEmail() {
        const subject = encodeURIComponent(`Data Submission — ${this.title}`);
        const body = encodeURIComponent(
            `Hello,\n\nI would like to submit data for ${this.title}.\n\nPlease find the attached CSV file.\n\nBest regards`
        );
        window.open(`mailto:${this.email}?subject=${subject}&body=${body}`);
    }

    openReportBugEmail() {
        const subject = encodeURIComponent(`Bug Report — ${this.title}`);
        const body = encodeURIComponent(
            `Hello,\n\nI found an issue:\n\n**What happened:**\n\n**Steps to reproduce:**\n\n**Browser:**\n\nBest regards`
        );
        window.open(`mailto:${this.email}?subject=${subject}&body=${body}`);
    }

    openSuggestionEmail() {
        const subject = encodeURIComponent(`Feature Suggestion — ${this.title}`);
        const body = encodeURIComponent(
            `Hello,\n\nI have a suggestion for ${this.title}:\n\n**Description:**\n\nBest regards`
        );
        window.open(`mailto:${this.email}?subject=${subject}&body=${body}`);
    }
}

export default EmailHelper;
