package com.clinica.bot.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "parceiros")
public class Parceiro {
    @Id
    private String id;
    private Double lat;
    private Double lng;
    private Instant createdAt;
    private Map<String, Object> extra;
}
